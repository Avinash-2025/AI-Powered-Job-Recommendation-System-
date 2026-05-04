"""SQLite-backed TF-IDF + KNN job recommender."""

from __future__ import annotations

from collections import Counter
from functools import lru_cache
import re
from urllib.parse import quote_plus

from database import list_jobs

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.neighbors import NearestNeighbors
    from sklearn.preprocessing import MultiLabelBinarizer
except Exception:  # pragma: no cover
    TfidfVectorizer = None
    cosine_similarity = None
    NearestNeighbors = None
    MultiLabelBinarizer = None


RELATED = {
    "python": {"pandas", "numpy", "scikit-learn", "machine learning", "flask", "django", "fastapi", "data analysis"},
    "machine learning": {"ai", "artificial intelligence", "deep learning", "pandas", "python", "model evaluation", "tensorflow", "pytorch"},
    "ai": {"machine learning", "artificial intelligence", "deep learning", "nlp", "computer vision", "generative ai"},
    "sql": {"database", "mysql", "postgresql", "sqlite", "etl"},
    "excel": {"spreadsheet", "power bi", "data analysis", "reporting", "dashboarding"},
    "react": {"javascript", "typescript", "frontend", "html", "css", "ui development", "next.js"},
    "javascript": {"typescript", "react", "node.js", "frontend", "angular", "vue.js", "express.js"},
    "java": {"spring boot", "backend", "object oriented programming", "c++", "c#"},
    "aws": {"cloud computing", "azure", "google cloud", "devops", "cloud engineer"},
    "devops": {"ci/cd", "aws", "docker", "kubernetes", "linux", "cloud computing"},
    "digital marketing": {"seo", "social media", "google ads", "analytics", "content marketing"},
    "hr": {"recruiting", "talent acquisition", "onboarding", "communication"},
    "communication": {"customer support", "sales", "hr", "business communication", "presentation"},
    "sales": {"business development", "lead generation", "crm", "negotiation", "b2b"},
    "accounting": {"finance", "bookkeeping", "tally", "gst", "financial reporting"},
    "testing": {"automation testing", "manual testing", "selenium", "qa", "quality assurance"},
}
for key, values in list(RELATED.items()):
    for value in values:
        RELATED.setdefault(value, set()).add(key)


def clean_text(value: str) -> str:
    text = str(value or "").lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9\s.+#-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\bml\b", "machine learning", text)
    text = re.sub(r"\bpowerbi\b", "power bi", text)
    return text


def split_skills(value: str) -> list[str]:
    parts = re.split(r"\s*[,.;\n]\s*", str(value or ""))
    return [clean_text(part) for part in parts if clean_text(part)]


def _open_location(value: str) -> str:
    location = clean_text(value)
    if location in {"other", "others", "any", "anywhere", "all", "all locations", "others anywhere", "other anywhere"}:
        return ""
    return location


def _number_values(value: str) -> list[float]:
    return [float(item) for item in re.findall(r"\d+(?:\.\d+)?", str(value or ""))]


def _experience_range(value: str) -> tuple[float, float] | None:
    text = clean_text(value)
    if not text:
        return None
    if any(word in text for word in ("fresher", "entry", "campus", "graduate", "internship", "intern", "trainee")):
        return (0.0, 1.0)
    numbers = _number_values(text)
    if not numbers:
        return None
    if "+" in text or "plus" in text:
        return (numbers[0], 50.0)
    if len(numbers) == 1:
        return (numbers[0], numbers[0])
    return (min(numbers[0], numbers[1]), max(numbers[0], numbers[1]))


def _experience_score(user_experience: str, job_experience: str) -> float | None:
    wanted = _experience_range(user_experience)
    offered = _experience_range(job_experience)
    if not wanted or not offered:
        return None
    overlap = max(0.0, min(wanted[1], offered[1]) - max(wanted[0], offered[0]))
    wanted_span = max(wanted[1] - wanted[0], 1.0)
    offered_span = max(offered[1] - offered[0], 1.0)
    if overlap > 0:
        return min(1.0, 0.55 + (overlap / max(wanted_span, offered_span)) * 0.45)
    if wanted[1] < offered[0]:
        gap = offered[0] - wanted[1]
    elif wanted[0] > offered[1]:
        gap = wanted[0] - offered[1]
    else:
        gap = 0.0
    return min(1.0, max(0.1, 0.75 - gap * 0.18))


def _salary_range(value: str) -> tuple[float, float, str] | None:
    text = clean_text(value)
    numbers = _number_values(text)
    if not numbers:
        return None
    currency = "usd" if "$" in str(value) or "usd" in text or "k" in text else "lpa"
    if len(numbers) == 1:
        low = high = numbers[0]
    else:
        low, high = min(numbers[0], numbers[1]), max(numbers[0], numbers[1])
    return (low, high, currency)


def _salary_score(expectation: str, job_salary: str) -> float | None:
    wanted = _salary_range(expectation)
    offered = _salary_range(job_salary)
    if not wanted or not offered:
        return None
    if wanted[2] != offered[2]:
        return None
    wanted_amount = wanted[0]
    offered_low, offered_high = offered[0], offered[1]
    if offered_high >= wanted_amount:
        return 1.0 if offered_low >= wanted_amount else 0.82
    gap_ratio = (wanted_amount - offered_high) / max(wanted_amount, 1.0)
    return max(0.15, 0.75 - gap_ratio)


def _location_score(preferred_location: str, job_location: str) -> float | None:
    preferred = _open_location(preferred_location)
    if not preferred:
        return None
    job_loc = clean_text(job_location)
    if not job_loc:
        return 0.35
    if preferred in job_loc or job_loc in preferred:
        return 1.0
    if "remote" in preferred and "remote" in job_loc:
        return 1.0
    if "remote" in job_loc:
        return 0.72
    if "hybrid" in job_loc and any(part and part in job_loc for part in preferred.split()):
        return 0.88
    return 0.12


def _role_score(preferred_role: str, job: dict) -> float | None:
    role = clean_text(preferred_role)
    if not role:
        return None
    title = clean_text(job.get("title", ""))
    text = job.get("_text", "")
    role_terms = [term for term in role.split() if len(term) > 1]
    if role in title:
        return 1.0
    if role in text:
        return 0.82
    if not role_terms:
        return None
    matched = sum(1 for term in role_terms if term in title or term in text)
    return matched / len(role_terms) if matched else 0.08


def _education_score(education: str, job: dict) -> float | None:
    edu = clean_text(education)
    if not edu:
        return None
    text = job.get("_text", "")
    if edu in text:
        return 1.0
    if edu in {"bachelor", "master", "diploma", "phd", "mba"}:
        return 0.55
    return None


def _preference_score(job: dict, education: str, experience: str, location: str, preferred_role: str, salary_expectation: str) -> tuple[float, dict]:
    components: list[tuple[str, float, float]] = []
    role = _role_score(preferred_role, job)
    location_context = " ".join([job.get("location", ""), job.get("job_type", "")])
    if "remote" in _open_location(location):
        location_context = " ".join([location_context, job.get("title", "")])
    loc = _location_score(location, location_context)
    exp = _experience_score(experience, job.get("experience", ""))
    salary = _salary_score(salary_expectation, job.get("salary", ""))
    edu = _education_score(education, job)
    if role is not None:
        components.append(("role", role, 0.28))
    if loc is not None:
        components.append(("location", loc, 0.34))
    if exp is not None:
        components.append(("experience", exp, 0.20))
    if salary is not None:
        components.append(("salary", salary, 0.12))
    if edu is not None:
        components.append(("education", edu, 0.06))
    if not components:
        return 1.0, {}
    total_weight = sum(weight for _, _, weight in components)
    score = sum(value * weight for _, value, weight in components) / total_weight
    return score, {name: round(value, 2) for name, value, _ in components}


def _public(job: dict) -> dict:
    apply_url = _apply_url(job)
    return {
        "id": int(job["id"]),
        "title": job["title"],
        "company": job["company"],
        "location": job.get("location", ""),
        "salary": job.get("salary", ""),
        "type": job.get("job_type", "Full-time"),
        "experience": job.get("experience", ""),
        "education": "Not specified",
        "skills": job.get("skills", ""),
        "description": job.get("description", ""),
        "apply_url": apply_url,
        "source": "SQLite admin jobs",
    }


def _apply_url(job: dict) -> str:
    company = str(job.get("company", "")).strip()
    title = str(job.get("title", "")).strip()
    query = quote_plus(" ".join(part for part in [company, title, "careers apply"] if part))
    known = {
        "google": "https://careers.google.com/jobs/results/?q=",
        "microsoft": "https://jobs.careers.microsoft.com/global/en/search?q=",
        "amazon": "https://www.amazon.jobs/en/search?base_query=",
        "infosys": "https://career.infosys.com/joblist",
        "tcs": "https://www.tcs.com/careers",
        "wipro": "https://careers.wipro.com/careers-home/",
    }
    key = clean_text(company)
    for name, url in known.items():
        if name in key:
            return f"{url}{quote_plus(title)}"
    return f"https://www.google.com/search?q={query}"


@lru_cache(maxsize=1)
def _jobs() -> list[dict]:
    rows = list_jobs(limit=10000)
    for row in rows:
        row["_skill_list"] = split_skills(row.get("skills", ""))
        row["_text"] = clean_text(" ".join([row.get("title", ""), row.get("company", ""), row.get("skills", ""), row.get("description", "")]))
    return rows


def invalidate_job_cache() -> None:
    _jobs.cache_clear()
    _model.cache_clear()


@lru_cache(maxsize=1)
def _model():
    jobs = _jobs()
    corpus = [job["_text"] for job in jobs]
    skill_lists = [job["_skill_list"] for job in jobs]
    if not jobs or TfidfVectorizer is None:
        return {"jobs": jobs, "tfidf": None, "matrix": None, "mlb": None, "knn": None}
    tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=8000, token_pattern=r"(?u)[a-z0-9.+#-]+")
    matrix = tfidf.fit_transform(corpus)
    mlb = MultiLabelBinarizer()
    skill_matrix = mlb.fit_transform(skill_lists)
    knn = NearestNeighbors(metric="cosine", algorithm="brute")
    knn.fit(skill_matrix)
    return {"jobs": jobs, "tfidf": tfidf, "matrix": matrix, "mlb": mlb, "knn": knn, "skill_matrix": skill_matrix}


def dataset_summary() -> dict:
    jobs = _jobs()
    return {"jobs": len(jobs), "source": "SQLite admin jobs", "dataset_file": "SQLite jobs table"}


def get_skill_vocabulary() -> set[str]:
    return {skill for job in _jobs() for skill in job["_skill_list"]}


def _forms(skill: str) -> set[str]:
    skill = clean_text(skill)
    return {skill, *RELATED.get(skill, set())}


def calculate_skill_match(user_skills: str, job_skills: str | list[str]) -> dict:
    users = split_skills(user_skills)
    jobs = job_skills if isinstance(job_skills, list) else split_skills(job_skills)
    matched, missing, units = [], [], 0.0
    for job_skill in jobs:
        direct = any(user == job_skill or user in job_skill or job_skill in user for user in users)
        related = False if direct else any(_forms(user) & _forms(job_skill) for user in users)
        if direct:
            matched.append(job_skill)
            units += 1.0
        elif related:
            matched.append(job_skill)
            units += 0.65
        else:
            missing.append(job_skill)
    user_coverage = len({skill for skill in users if any(skill == job_skill or skill in job_skill or job_skill in skill or _forms(skill) & _forms(job_skill) for job_skill in jobs)}) / max(len(users), 1)
    job_coverage = units / max(len(jobs), 1)
    score = (job_coverage * 0.45) + (user_coverage * 0.55)
    if not users:
        score = 0.0
    return {"match": round(score * 100), "score": round(score, 4), "matched_skills": matched[:12], "missing_skills": missing[:12]}


def recommend_jobs(skills: str, education: str = "", experience: str = "", location: str = "", top_n: int = 5, preferred_role: str = "", salary_expectation: str = "", collaborative_job_ids: list[int] | None = None) -> list[dict]:
    cache = _model()
    jobs = cache["jobs"]
    has_input = any(str(value or "").strip() for value in (skills, education, experience, location, preferred_role, salary_expectation))
    if not has_input or not jobs:
        return []
    query = clean_text(" ".join([skills, preferred_role]))
    if cache["tfidf"] is None:
        tfidf_scores = [0.0 for _ in jobs]
    else:
        tfidf_scores = cosine_similarity(cache["tfidf"].transform([query]), cache["matrix"]).flatten().tolist()
    tfidf_max = max(tfidf_scores) if tfidf_scores else 0.0
    tfidf_norm = [(score / tfidf_max) if tfidf_max else 0.0 for score in tfidf_scores]
    user_labels = [skill for skill in split_skills(skills) if cache["mlb"] is not None and skill in set(cache["mlb"].classes_)]
    knn_scores = [0.0 for _ in jobs]
    if user_labels and cache["knn"] is not None:
        distances, indices = cache["knn"].kneighbors(cache["mlb"].transform([user_labels]), n_neighbors=len(jobs))
        for distance, index in zip(distances[0], indices[0]):
            knn_scores[int(index)] = max(0.0, 1.0 - float(distance))
    results = []
    has_skills = bool(split_skills(skills))
    for index, job in enumerate(jobs):
        skill_match = calculate_skill_match(skills, job["_skill_list"])
        skill_score = float(skill_match["score"])
        preference_score, preference_matches = _preference_score(job, education, experience, location, preferred_role, salary_expectation)
        text_score = float(tfidf_norm[index])
        knn_score = float(knn_scores[index])
        if has_skills:
            final = (skill_score * 0.38) + (preference_score * 0.32) + (knn_score * 0.15) + (text_score * 0.15)
        else:
            final = (text_score * 0.40) + (preference_score * 0.60)
        location_preference = preference_matches.get("location")
        if location_preference is not None:
            final *= 0.30 + (0.70 * location_preference)
        role_preference = preference_matches.get("role")
        if role_preference is not None:
            final *= 0.40 + (0.60 * role_preference)
        if has_skills and skill_score < 0.12 and preference_matches.get("role", 0) < 0.5:
            continue
        if final < 0.08:
            continue
        item = _public(job)
        item.update({
            "match": min(99, round(final * 100)),
            "final_score": round(final, 4),
            "tfidf_score": round(text_score, 4),
            "knn_score": round(knn_score, 4),
            "skill_score": round(skill_score, 4),
            "preference_score": round(preference_score, 4),
            "preference_matches": preference_matches,
            "matched_skills": skill_match["matched_skills"],
            "missing_skills": skill_match["missing_skills"],
        })
        results.append(item)
    results.sort(key=lambda item: item["final_score"], reverse=True)
    return results[:top_n]


def search_jobs(keyword: str = "", location: str = "", role: str = "", min_salary: int = 0, limit: int = 50, offset: int = 0) -> dict:
    query = clean_text(" ".join([keyword, role]))
    loc = _open_location(location)
    rows = []
    for job in _jobs():
        haystack = job["_text"]
        if query and not all(term in haystack for term in query.split()):
            continue
        if loc and loc not in clean_text(job.get("location", "")):
            continue
        if min_salary:
            offered = _salary_range(job.get("salary", ""))
            if offered and offered[1] < min_salary:
                continue
        rows.append(_public(job))
    return {"jobs": rows[offset:offset + limit], "total": len(rows), "limit": limit, "offset": offset}


def jobs_by_ids(job_ids: list[int]) -> list[dict]:
    wanted = set(job_ids)
    return [_public(job) for job in _jobs() if int(job["id"]) in wanted]


def skill_gap_for_jobs(skills: str, jobs: list[dict]) -> dict:
    missing = Counter()
    matched = Counter()
    for job in jobs:
        missing.update(job.get("missing_skills", []))
        matched.update(job.get("matched_skills", []))
    return {"matched": [skill for skill, _ in matched.most_common(15)], "missing": [skill for skill, _ in missing.most_common(15)]}


ROLE_GUIDES = [
    {
        "keywords": ("machine learning", "ai", "data scientist", "ml engineer"),
        "label": "Machine Learning / AI",
        "core": ["python", "sql", "statistics", "pandas", "numpy", "scikit-learn", "machine learning", "model evaluation"],
        "proof": ["Train a prediction model on a real dataset", "Explain accuracy, precision, recall, and errors", "Publish the notebook or app on GitHub"],
        "certs": ["Google Machine Learning Crash Course", "Kaggle Python and Pandas", "AWS or Azure AI fundamentals"],
        "interview": ["ML basics", "Python coding", "SQL queries", "project explanation"],
    },
    {
        "keywords": ("data analyst", "business analyst", "power bi", "analytics"),
        "label": "Data Analyst",
        "core": ["excel", "sql", "python", "power bi", "statistics", "data cleaning", "dashboarding", "business communication"],
        "proof": ["Build a sales or HR dashboard", "Write 5 insights from the data", "Show before/after cleaned data"],
        "certs": ["Google Data Analytics", "Microsoft Power BI", "Kaggle SQL"],
        "interview": ["SQL joins", "Excel formulas", "dashboard explanation", "business case questions"],
    },
    {
        "keywords": ("frontend", "react", "ui developer"),
        "label": "Frontend Developer",
        "core": ["html", "css", "javascript", "react", "typescript", "responsive design", "api integration"],
        "proof": ["Build a responsive portfolio app", "Connect one app to an API", "Deploy it and add screenshots"],
        "certs": ["React official tutorial", "freeCodeCamp Front End", "TypeScript handbook"],
        "interview": ["JavaScript basics", "React hooks", "CSS layouts", "API handling"],
    },
    {
        "keywords": ("backend", "python developer", "java developer", "node", "software engineer", "full stack"),
        "label": "Software / Backend Developer",
        "core": ["programming basics", "python", "java", "javascript", "sql", "rest api", "git", "testing"],
        "proof": ["Build a CRUD web app", "Add login and database storage", "Deploy the backend with clear API docs"],
        "certs": ["CS50 or freeCodeCamp", "Git and GitHub", "Cloud fundamentals"],
        "interview": ["data structures", "database design", "API design", "debugging"],
    },
    {
        "keywords": ("digital marketing", "marketing", "seo", "social media"),
        "label": "Digital Marketing",
        "core": ["seo", "content marketing", "social media", "google ads", "analytics", "copywriting", "campaign planning"],
        "proof": ["Create a 30-day content calendar", "Run a sample campaign plan", "Measure traffic, clicks, and conversions"],
        "certs": ["Google Digital Garage", "Google Analytics", "HubSpot Content Marketing"],
        "interview": ["campaign planning", "SEO basics", "content strategy", "analytics reports"],
    },
    {
        "keywords": ("sales", "business development"),
        "label": "Sales / Business Development",
        "core": ["communication", "negotiation", "crm", "lead generation", "product knowledge", "follow-up", "presentation"],
        "proof": ["Prepare a sales pitch", "Create a lead tracking sheet", "Practice objection handling scripts"],
        "certs": ["HubSpot Sales", "CRM basics", "LinkedIn sales training"],
        "interview": ["pitching", "handling rejection", "customer needs", "sales targets"],
    },
    {
        "keywords": ("hr", "recruiter", "human resources"),
        "label": "HR / Recruiter",
        "core": ["communication", "recruiting", "screening resumes", "interview coordination", "onboarding", "employee relations"],
        "proof": ["Create a sample hiring pipeline", "Write a job description", "Practice candidate screening notes"],
        "certs": ["HR fundamentals", "LinkedIn recruiter basics", "Interviewing skills"],
        "interview": ["candidate screening", "HR policies", "communication scenarios", "onboarding"],
    },
    {
        "keywords": ("accounting", "finance", "accountant"),
        "label": "Accounting / Finance",
        "core": ["accounting basics", "excel", "tally", "bookkeeping", "gst", "financial reporting", "attention to detail"],
        "proof": ["Prepare sample journal entries", "Create a monthly expense report", "Build an Excel finance tracker"],
        "certs": ["Tally basics", "Excel for finance", "Accounting fundamentals"],
        "interview": ["journal entries", "balance sheet basics", "Excel formulas", "tax basics"],
    },
    {
        "keywords": ("customer support", "support", "service"),
        "label": "Customer Support",
        "core": ["communication", "problem solving", "email writing", "ticket handling", "product knowledge", "patience"],
        "proof": ["Write sample support replies", "Create a simple FAQ document", "Practice solving customer scenarios"],
        "certs": ["Zendesk customer service", "Communication fundamentals", "CRM basics"],
        "interview": ["customer scenarios", "conflict handling", "clear writing", "ticket prioritization"],
    },
    {
        "keywords": ("content", "writer", "graphic designer", "design", "ui ux"),
        "label": "Creative / Content",
        "core": ["communication", "portfolio", "research", "editing", "seo", "figma", "visual design"],
        "proof": ["Create 3 portfolio samples", "Write case studies for each sample", "Publish work in a simple portfolio"],
        "certs": ["HubSpot content marketing", "Figma basics", "SEO fundamentals"],
        "interview": ["portfolio review", "creative process", "client feedback", "deadline handling"],
    },
    {
        "keywords": ("teacher", "teaching", "trainer"),
        "label": "Teaching / Training",
        "core": ["subject knowledge", "communication", "lesson planning", "classroom management", "assessment", "patience"],
        "proof": ["Prepare one lesson plan", "Record a short teaching demo", "Create a quiz or worksheet"],
        "certs": ["Teaching methods", "Communication skills", "Subject-specific certification"],
        "interview": ["teaching demo", "student handling", "lesson planning", "assessment methods"],
    },
]


def _role_guide(target_role: str, jobs: list[dict]) -> dict:
    target_text = clean_text(target_role)
    for guide in ROLE_GUIDES:
        if target_text and any(keyword in target_text for keyword in guide["keywords"]):
            return guide
    text = clean_text(" ".join([jobs[0].get("title", "") if jobs else "", jobs[0].get("skills", "") if jobs else ""]))
    for guide in ROLE_GUIDES:
        if any(keyword in text for keyword in guide["keywords"]):
            return guide
    return {
        "label": target_role.strip() or (jobs[0]["title"] if jobs else "Target Role"),
        "core": split_skills(jobs[0].get("skills", ""))[:7] if jobs else ["communication", "basic tools", "domain knowledge", "problem solving"],
        "proof": ["Build one small practical project or work sample", "Write what problem you solved", "Add it to your resume or portfolio"],
        "certs": ["Complete one beginner course", "Practice the main tools used in this role", "Ask for feedback from a mentor or teacher"],
        "interview": ["role basics", "your project or sample work", "communication", "common HR questions"],
    }


def _missing_core_skills(skills: str, core_skills: list[str], job_missing: list[str]) -> list[str]:
    user_skills = split_skills(skills)
    missing = []
    for skill in [*core_skills, *job_missing]:
        skill = clean_text(skill)
        if not skill:
            continue
        has_skill = any(user == skill or user in skill or skill in user or _forms(user) & _forms(skill) for user in user_skills)
        if not has_skill and skill not in missing:
            missing.append(skill)
    return missing[:8]


def build_roadmap(skills: str, jobs: list[dict], target_role: str = "") -> list[dict]:
    gap = skill_gap_for_jobs(skills, jobs)
    target = (target_role or (jobs[0]["title"] if jobs else "target role")).replace("Roadmap", "").strip()
    guide = _role_guide(target, jobs)
    missing = _missing_core_skills(skills, guide["core"], gap["missing"])
    first_skills = missing[:4] or guide["core"][:4]
    matched = gap["matched"][:4]
    return [
        {
            "phase": "Step 1",
            "title": f"Understand the {guide['label']} role",
            "duration": "2-3 days",
            "items": [
                f"Read 5 job descriptions for {target or guide['label']}",
                "Note the repeated skills, tools, and responsibilities",
                "Mark what you already know and what you need to learn",
            ],
            "outcome": "You know what employers actually expect.",
        },
        {
            "phase": "Step 2",
            "title": "Learn the highest-priority skills",
            "duration": "3-5 weeks",
            "items": first_skills,
            "outcome": f"You cover the main skill gap for {target or guide['label']}.",
        },
        {
            "phase": "Step 3",
            "title": "Build practical proof",
            "duration": "3-4 weeks",
            "items": guide["proof"],
            "outcome": "You have work samples to show, not only course names.",
        },
        {
            "phase": "Step 4",
            "title": "Add one useful certification",
            "duration": "1-2 weeks",
            "items": guide["certs"],
            "outcome": "Your resume has a credible learning signal.",
        },
        {
            "phase": "Step 5",
            "title": "Prepare and apply",
            "duration": "1-2 weeks",
            "items": [
                f"Update resume headline for {target or guide['label']}",
                f"Highlight matching skills: {', '.join(matched) if matched else ', '.join(guide['core'][:3])}",
                "Practice: " + ", ".join(guide["interview"][:4]),
                "Apply to 5-10 matching jobs and track responses",
            ],
            "outcome": "You are ready to apply with a clear profile and practice plan.",
        },
    ]


def extract_known_skills(text: str) -> list[str]:
    lowered = clean_text(text)
    vocabulary = set(get_skill_vocabulary())
    for guide in ROLE_GUIDES:
        vocabulary.update(guide["core"])
    vocabulary.update(RELATED.keys())
    found = [skill for skill in sorted(vocabulary, key=len, reverse=True) if skill and skill in lowered]
    return list(dict.fromkeys(found))[:20]
