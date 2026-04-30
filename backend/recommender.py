"""Real-world job recommendation engine.

Dataset priority:
1. backend/dataset/real_job_postings.csv
   Public Hugging Face CSV: will4381/job-posting-classification
   ~33k job postings with titles, companies, skills, qualifications, salary,
   responsibilities, and employment type.
2. backend/dataset/jobs.csv
   Small bundled fallback sample for offline demos.

The model caches the loaded jobs and TF-IDF matrix so requests stay fast after
the first load.
"""

from __future__ import annotations

from collections import Counter
import csv
import math
import re
from functools import lru_cache
from pathlib import Path

try:
    import pandas as pd
except Exception:  # pragma: no cover
    pd = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:  # pragma: no cover
    TfidfVectorizer = None
    cosine_similarity = None


BASE_DIR = Path(__file__).resolve().parent
REAL_DATASET_PATH = BASE_DIR / "dataset" / "real_job_postings.csv"
NORMALIZED_DATASET_PATH = BASE_DIR / "dataset" / "jobs_real_enriched.csv"
FALLBACK_DATASET_PATH = BASE_DIR / "dataset" / "jobs.csv"

EXP_LEVELS = ["Fresher", "1-3 years", "3-5 years", "5+ years"]
EXP_MAP = {
    "fresher": "Fresher",
    "freshers": "Fresher",
    "intern": "Fresher",
    "internship": "Fresher",
    "entry": "Fresher",
    "entry level": "Fresher",
    "0": "Fresher",
    "0-1": "Fresher",
    "1-3": "1-3 years",
    "1 to 3": "1-3 years",
    "3-5": "3-5 years",
    "3 to 5": "3-5 years",
    "5+": "5+ years",
    "senior": "5+ years",
}

ALIASES = {
    "js": "javascript",
    "reactjs": "react",
    "react.js": "react",
    "node": "node.js",
    "nodejs": "node.js",
    "next": "next.js",
    "nextjs": "next.js",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "genai": "generative ai",
    "llms": "llm",
    "uiux": "ui ux",
    "uxui": "ux ui",
    "golang": "go",
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}

GENERIC_SKILL_WORDS = {
    "ability",
    "advanced",
    "analysis",
    "analytical",
    "applications",
    "basic",
    "best",
    "business",
    "care",
    "collaboration",
    "communication",
    "computer",
    "customer",
    "data",
    "degree",
    "design",
    "development",
    "engineering",
    "environment",
    "excellent",
    "experience",
    "knowledge",
    "management",
    "operations",
    "problem-solving",
    "process",
    "product",
    "professional",
    "project",
    "quality",
    "requirements",
    "responsibilities",
    "services",
    "skills",
    "software",
    "strong",
    "support",
    "systems",
    "team",
    "technical",
    "technology",
    "tools",
    "work",
    "working",
}

TOKEN_PATTERN = re.compile(r"[a-z0-9][a-z0-9.+#-]*")


def clean_text(text: str) -> str:
    text = str(text or "").lower().replace("&", " and ")
    text = re.sub(r"[/_,;|]+", " ", text)
    text = re.sub(r"[^a-z0-9\s.+#-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    for source, target in ALIASES.items():
        text = re.sub(rf"(?<![a-z0-9.+#-]){re.escape(source)}(?![a-z0-9.+#-])", target, text)
    tokens = [token for token in TOKEN_PATTERN.findall(text) if token not in STOPWORDS]
    return " ".join(tokens)


def tokenize(text: str) -> list[str]:
    return clean_text(text).split()


def split_skills(skill_text: str) -> list[str]:
    """Split real dataset skill text into readable skill phrases."""
    parts = re.split(r"\s*[.;\n]\s*|\s{2,}", str(skill_text or ""))
    skills: list[str] = []
    for part in parts:
        cleaned = clean_text(part)
        if not cleaned:
            continue
        words = cleaned.split()
        if len(words) > 7:
            continue
        if len(words) == 1 and (words[0] in GENERIC_SKILL_WORDS or len(words[0]) < 2):
            continue
        skills.append(cleaned)
    return sorted(dict.fromkeys(skills))


def _infer_experience(text: str) -> str:
    normalized = clean_text(text)
    years = [int(value) for value in re.findall(r"(\d+)\+?\s*(?:years|yrs|year)", normalized)]
    if not years:
        if any(term in normalized for term in ("intern", "entry level", "junior", "apprentice")):
            return "Fresher"
        return "1-3 years"
    highest = max(years)
    if highest <= 1:
        return "Fresher"
    if highest <= 3:
        return "1-3 years"
    if highest <= 5:
        return "3-5 years"
    return "5+ years"


def _infer_education(text: str) -> str:
    normalized = clean_text(text)
    if "phd" in normalized or "doctorate" in normalized:
        return "PhD"
    if "master" in normalized or "mba" in normalized:
        return "Master"
    if "bachelor" in normalized or "bs " in normalized or "ba " in normalized:
        return "Bachelor"
    if "high school" in normalized or "ged" in normalized:
        return "High School"
    return "Not specified"


def _infer_location(text: str) -> str:
    raw = str(text or "")
    if re.search(r"\bremote\b", raw, re.IGNORECASE):
        return "Remote"
    match = re.search(r"(?:location|remote):\s*([^.\n|#]+)", raw, re.IGNORECASE)
    if match:
        return match.group(1).strip()[:80]
    return "Not specified"


def _safe(value: object, default: str = "Not specified") -> str:
    text = str(value or "").strip()
    if text.lower() in {"nan", "none", "null", ""}:
        return default
    return text


def _normalize_real_jobs(frame_or_rows) -> list[dict]:
    jobs: list[dict] = []
    if hasattr(frame_or_rows, "fillna"):
        iterator = frame_or_rows.fillna("").iterrows()
    else:
        iterator = enumerate(frame_or_rows)

    for index, row in iterator:
        description = " ".join(
            _safe(row.get(column), "")
            for column in (
                "original_description",
                "required_qualifications",
                "job_responsibilities",
                "ideal_candidate_summary",
            )
        ).strip()
        skills = _safe(row.get("relevant_skills"), "")
        if not _safe(row.get("job_position"), "") or not (skills or description):
            continue
        qualifications = _safe(row.get("required_qualifications"), "")
        employment = _safe(row.get("employment_type"), _safe(row.get("job_type"), "Not specified"))
        original = _safe(row.get("original_description"), "")
        title = _safe(row.get("job_position"), "Untitled role")
        company = _safe(row.get("company_name"), "Company not listed")
        job = {
            "id": int(index) + 1,
            "title": title,
            "company": company,
            "location": _infer_location(original),
            "salary": _safe(row.get("salary_range"), "Not listed"),
            "type": employment,
            "experience": _infer_experience(f"{title} {qualifications} {description}"),
            "education": _infer_education(qualifications or description),
            "skills": skills,
            "description": (description[:800] or f"{title} at {company}"),
            "source": "will4381/job-posting-classification",
        }
        job["_skill_list"] = split_skills(skills)
        job["_text"] = " ".join([title, company, skills, job["description"], qualifications, employment])
        job["_search"] = clean_text(job["_text"])
        job["_role"] = clean_text(title)
        job["_location"] = clean_text(job["location"])
        job["_salary_floor"] = parse_salary_floor(job["salary"])
        jobs.append(job)
    return jobs


def _load_fallback_jobs() -> list[dict]:
    with FALLBACK_DATASET_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    for job in rows:
        job["id"] = int(job["id"])
        job["source"] = "local fallback"
        job["_skill_list"] = split_skills(job.get("skills", ""))
        job["_text"] = " ".join([job.get("title", ""), job.get("skills", ""), job.get("description", "")])
        job["_search"] = clean_text(job["_text"])
        job["_role"] = clean_text(job.get("title", ""))
        job["_location"] = clean_text(job.get("location", ""))
        job["_salary_floor"] = parse_salary_floor(job.get("salary", ""))
    return rows


def _load_normalized_jobs() -> list[dict]:
    with NORMALIZED_DATASET_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    jobs: list[dict] = []
    for row in rows:
        row["id"] = int(row["id"])
        row["source"] = row.get("source") or "will4381/job-posting-classification"
        row["_skill_list"] = [skill for skill in row.get("skill_list", "").split("||") if skill]
        row["_text"] = " ".join(
            [
                row.get("title", ""),
                row.get("company", ""),
                row.get("skills", ""),
                row.get("description", ""),
                row.get("type", ""),
            ]
        )
        row["_search"] = row.get("search_text") or clean_text(row["_text"])
        row["_role"] = row.get("role_text") or clean_text(row.get("title", ""))
        row["_location"] = row.get("location_text") or clean_text(row.get("location", ""))
        row["_salary_floor"] = int(row.get("salary_floor") or parse_salary_floor(row.get("salary", "")))
        jobs.append(row)
    return jobs


@lru_cache(maxsize=1)
def load_jobs() -> list[dict]:
    if NORMALIZED_DATASET_PATH.exists():
        return _load_normalized_jobs()
    if REAL_DATASET_PATH.exists():
        if pd is not None:
            frame = pd.read_csv(REAL_DATASET_PATH)
            return _normalize_real_jobs(frame)
        with REAL_DATASET_PATH.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        return _normalize_real_jobs(rows)
    return _load_fallback_jobs()


@lru_cache(maxsize=1)
def dataset_summary() -> dict:
    jobs = load_jobs()
    dataset_file = NORMALIZED_DATASET_PATH if NORMALIZED_DATASET_PATH.exists() else REAL_DATASET_PATH if REAL_DATASET_PATH.exists() else FALLBACK_DATASET_PATH
    return {
        "jobs": len(jobs),
        "source": jobs[0].get("source", "unknown") if jobs else "unknown",
        "dataset_file": str(dataset_file),
    }


def public_job(job: dict, include_match_fields: bool = False) -> dict:
    result = {
        "id": int(job["id"]),
        "title": job["title"],
        "company": job["company"],
        "location": job["location"],
        "salary": job["salary"],
        "type": job["type"],
        "experience": job["experience"],
        "education": job["education"],
        "skills": job["skills"],
        "description": job["description"],
        "source": job.get("source", "real dataset"),
    }
    if include_match_fields:
        result["match"] = job.get("match", 0)
        result["matched_skills"] = job.get("matched_skills", [])
        result["missing_skills"] = job.get("missing_skills", [])
    return result


def parse_salary_floor(salary: str) -> int:
    text = str(salary or "").lower()
    raw_values = re.findall(r"\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?", text)
    if not raw_values:
        return 0
    values = []
    for number, suffix in raw_values:
        value = float(number.replace(",", ""))
        if suffix == "k" or value < 1000:
            value *= 1000
        values.append(int(value))
    return min(values) if values else 0


def search_jobs(
    keyword: str = "",
    location: str = "",
    role: str = "",
    min_salary: int = 0,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    keyword_norm = clean_text(keyword)
    location_norm = clean_text(location)
    role_norm = clean_text(role)
    filtered = []

    for job in load_jobs():
        haystack = job.get("_search") or clean_text(" ".join([job["title"], job["company"], job["skills"], job["description"], job["type"]]))
        if keyword_norm and not all(term in haystack for term in keyword_norm.split()):
            continue
        if role_norm and role_norm not in (job.get("_role") or clean_text(job["title"])):
            continue
        if location_norm and location_norm not in (job.get("_location") or clean_text(job["location"])) and location_norm not in clean_text(job["type"]):
            continue
        if min_salary and int(job.get("_salary_floor") or 0) < min_salary:
            continue
        filtered.append(public_job(job))

    return {
        "jobs": filtered[offset:offset + limit],
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
    }


def jobs_by_ids(job_ids: list[int]) -> list[dict]:
    wanted = set(job_ids)
    jobs = [public_job(job) for job in load_jobs() if int(job["id"]) in wanted]
    order = {job_id: index for index, job_id in enumerate(job_ids)}
    jobs.sort(key=lambda job: order.get(int(job["id"]), 999999))
    return jobs


@lru_cache(maxsize=1)
def _skill_vocabulary() -> tuple[str, ...]:
    vocab: set[str] = set()
    for job in load_jobs():
        for skill in job.get("_skill_list", []):
            vocab.add(skill)
            for token in skill.split():
                if token not in GENERIC_SKILL_WORDS and len(token) > 2:
                    vocab.add(token)
    return tuple(sorted(vocab))


def get_skill_vocabulary() -> set[str]:
    return set(_skill_vocabulary())


def extract_known_skills(text: str, vocabulary: set[str] | None = None) -> list[str]:
    vocabulary = vocabulary or get_skill_vocabulary()
    normalized = clean_text(text)
    tokens = set(normalized.split())
    matches: list[str] = []
    for skill in sorted(vocabulary, key=lambda item: (-len(item), item)):
        if len(skill) < 2:
            continue
        skill_tokens = skill.split()
        if len(skill_tokens) == 1 and skill in tokens:
            matches.append(skill)
        elif len(skill_tokens) <= 5 and all(token in tokens for token in skill_tokens):
            matches.append(skill)
    return sorted(dict.fromkeys(matches))


@lru_cache(maxsize=1)
def _model_cache():
    jobs = load_jobs()
    corpus = [clean_text(job.get("_text", "")) for job in jobs]
    if TfidfVectorizer is None or cosine_similarity is None:
        token_sets = [set(text.split()) for text in corpus]
        return {"jobs": jobs, "corpus": corpus, "token_sets": token_sets, "vectorizer": None, "matrix": None}
    vectorizer = TfidfVectorizer(
        token_pattern=r"(?u)\b[a-z0-9.+#-]+\b",
        ngram_range=(1, 2),
        min_df=2 if len(corpus) > 1000 else 1,
        max_df=0.92,
        max_features=30000,
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(corpus)
    return {"jobs": jobs, "corpus": corpus, "vectorizer": vectorizer, "matrix": matrix}


def _fallback_similarity(query: str, token_sets: list[set[str]]) -> list[float]:
    query_terms = set(tokenize(query))
    if not query_terms:
        return [0.0 for _ in token_sets]
    scores = []
    for terms in token_sets:
        shared = query_terms & terms
        scores.append(len(shared) / math.sqrt(len(query_terms) * max(len(terms), 1)))
    return scores


def _similarity_scores(query: str) -> list[float]:
    cache = _model_cache()
    if cache["vectorizer"] is None:
        return _fallback_similarity(query, cache["token_sets"])
    query_vector = cache["vectorizer"].transform([clean_text(query)])
    return cosine_similarity(query_vector, cache["matrix"]).flatten().tolist()


def _experience_score(user_exp: str, job_exp: str) -> float:
    mapped = EXP_MAP.get(clean_text(user_exp), user_exp)
    if mapped not in EXP_LEVELS or job_exp not in EXP_LEVELS:
        return 0.72
    diff = abs(EXP_LEVELS.index(mapped) - EXP_LEVELS.index(job_exp))
    return {0: 1.0, 1: 0.72, 2: 0.42, 3: 0.18}.get(diff, 0.18)


def _location_score(user_loc: str, job_loc: str) -> float:
    user = clean_text(user_loc)
    job = clean_text(job_loc)
    if not user or job == "not specified":
        return 0.76
    if "remote" in user:
        return 1.0 if "remote" in job else 0.45
    if "remote" in job:
        return 0.86
    return 1.0 if any(part in job for part in user.split() if len(part) > 2) else 0.42


def _education_score(user_education: str, job_education: str) -> float:
    user = clean_text(user_education)
    job = clean_text(job_education)
    if not user or job == "not specified":
        return 0.80
    if job in user or user in job:
        return 1.0
    if "phd" in job and "phd" not in user:
        return 0.38
    if "master" in job and not any(term in user for term in ("master", "phd")):
        return 0.58
    return 0.76


def recommend_jobs(
    skills: str,
    education: str = "",
    experience: str = "",
    location: str = "",
    top_n: int = 5,
) -> list[dict]:
    if not skills.strip():
        return []

    cache = _model_cache()
    jobs = cache["jobs"]
    query = " ".join([skills, education, experience, location])
    scores = _similarity_scores(query)
    user_skills = set(extract_known_skills(skills)) or set(tokenize(skills))
    candidates: list[dict] = []

    for index, job in enumerate(jobs):
        job_skills = set(job.get("_skill_list", []))
        matched = sorted(
            skill for skill in job_skills
            if skill in user_skills or any(token in user_skills for token in skill.split())
        )
        missing = sorted(skill for skill in job_skills if skill not in matched)
        coverage = len(matched) / max(len(job_skills), 1)
        composite = (
            0.68 * float(scores[index])
            + 0.16 * coverage
            + 0.08 * _experience_score(experience, str(job.get("experience", "")))
            + 0.05 * _location_score(location, str(job.get("location", "")))
            + 0.03 * _education_score(education, str(job.get("education", "")))
        )
        match = min(99, max(1, round(composite * 100)))
        if match < 8 and not matched:
            continue
        candidates.append(
            {
                "id": int(job["id"]),
                "title": job["title"],
                "company": job["company"],
                "location": job["location"],
                "salary": job["salary"],
                "type": job["type"],
                "experience": job["experience"],
                "education": job["education"],
                "skills": job["skills"],
                "description": job["description"],
                "source": job.get("source", "real dataset"),
                "match": match,
                "matched_skills": matched[:10],
                "missing_skills": missing[:12],
            }
        )

    candidates.sort(key=lambda item: item["match"], reverse=True)
    return candidates[:top_n]


def skill_gap_for_jobs(skills: str, jobs: list[dict]) -> dict:
    user_skills = set(extract_known_skills(skills)) or set(tokenize(skills))
    missing = Counter()
    matched = Counter()
    for job in jobs:
        matched.update(job.get("matched_skills", []))
        for skill in job.get("missing_skills", []):
            if skill not in user_skills:
                missing[skill] += 1
    return {
        "matched": [skill for skill, _ in matched.most_common(15)],
        "missing": [skill for skill, _ in missing.most_common(15)],
    }


def build_roadmap(skills: str, jobs: list[dict], target_role: str = "") -> list[dict]:
    gap = skill_gap_for_jobs(skills, jobs)
    missing = gap["missing"][:12]
    target = target_role or (jobs[0]["title"] if jobs else "target role")
    projects = _project_suggestions(target, missing)

    return [
        {
            "phase": "Phase 1",
            "title": "Close Core Skill Gaps",
            "duration": "2-4 weeks",
            "items": missing[:4] or ["Add more target-role skills to your profile"],
            "outcome": "You can explain and use the most common missing skills from real job postings.",
        },
        {
            "phase": "Phase 2",
            "title": "Build Role-Specific Proof",
            "duration": "4-6 weeks",
            "items": projects,
            "outcome": f"You have portfolio evidence for {target}.",
        },
        {
            "phase": "Phase 3",
            "title": "Apply and Iterate",
            "duration": "2 weeks",
            "items": [
                "Tailor resume bullets to the top matched skills",
                "Apply to 10-15 similar roles",
                "Track interview feedback and update your skill list",
            ],
            "outcome": "Your resume and applications are aligned with real market language.",
        },
    ]


def _project_suggestions(target_role: str, missing: list[str]) -> list[str]:
    role = clean_text(target_role)
    if any(term in role for term in ("data", "machine learning", "scientist", "analyst", "ai")):
        return [
            "Create an end-to-end data project with cleaning, SQL analysis, model training, and dashboard",
            f"Use {', '.join(missing[:3]) or 'your missing skills'} in one documented notebook",
            "Publish a README with metrics, tradeoffs, and business impact",
        ]
    if any(term in role for term in ("frontend", "react", "web", "full stack", "developer")):
        return [
            "Build a production-style web app with authentication, API integration, and tests",
            f"Add features using {', '.join(missing[:3]) or 'the missing stack skills'}",
            "Deploy it and include performance/accessibility notes",
        ]
    if any(term in role for term in ("cloud", "devops", "sre", "security")):
        return [
            "Deploy a containerized app with CI/CD, monitoring, and infrastructure-as-code",
            f"Practice {', '.join(missing[:3]) or 'the missing platform skills'} in a small lab",
            "Document incident response or operational runbooks",
        ]
    return [
        f"Build one portfolio project that uses {', '.join(missing[:3]) or 'your missing skills'}",
        "Write a case study explaining the problem, approach, and result",
        "Map each resume bullet to a requirement from the recommended jobs",
    ]
