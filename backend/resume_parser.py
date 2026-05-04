"""Resume PDF parser and skill-gap analyzer."""

from __future__ import annotations

import io
import re

from dynamic_recommender import build_roadmap, get_skill_vocabulary, recommend_jobs, skill_gap_for_jobs, split_skills

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    try:
        from PyPDF2 import PdfReader
    except Exception:
        PdfReader = None


EXTRA_SKILLS = {
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "sql", "mysql", "postgresql",
    "mongodb", "sqlite", "html", "css", "react", "angular", "vue.js", "node.js", "express.js",
    "django", "flask", "fastapi", "spring boot", "rest api", "git", "github", "docker",
    "kubernetes", "aws", "azure", "google cloud", "linux", "devops", "ci/cd", "data structures",
    "algorithms", "machine learning", "deep learning", "nlp", "computer vision", "generative ai",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "statistics", "data analysis",
    "data science", "data engineering", "etl", "excel", "power bi", "tableau", "data visualization",
    "business analysis", "agile", "scrum", "project management", "product management", "ui/ux design",
    "figma", "graphic design", "digital marketing", "seo", "google ads", "social media marketing",
    "content writing", "copywriting", "email marketing", "sales", "lead generation", "crm",
    "negotiation", "customer support", "communication", "presentation", "recruiting", "hr",
    "onboarding", "accounting", "finance", "tally", "gst", "bookkeeping", "teaching",
    "lesson planning", "data entry", "ms office", "cybersecurity", "network security",
    "manual testing", "automation testing", "selenium",
}


def extract_text_from_pdf(file_storage) -> str:
    """Extract text from uploaded PDF or plain text resume."""
    payload = file_storage.read()
    file_storage.seek(0)

    filename = (file_storage.filename or "").lower()
    if filename.endswith(".txt"):
        return payload.decode("utf-8", errors="ignore")

    if PdfReader is not None and filename.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(payload))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages).strip()
            if text:
                return text
        except Exception:
            pass

    return payload.decode("utf-8", errors="ignore")


def summarize_resume(text: str) -> dict:
    normalized = re.sub(r"\s+", " ", text or " ").strip()
    vocabulary = set(get_skill_vocabulary()) | EXTRA_SKILLS
    lowered = normalized.lower()
    skills = []
    for skill in sorted(vocabulary, key=len, reverse=True):
        if not skill:
            continue
        pattern = rf"(?<![a-z0-9+#.]){re.escape(skill.lower())}(?![a-z0-9+#.])"
        if re.search(pattern, lowered):
            skills.append(skill)
    if not skills:
        skills = split_skills(normalized)
    return {
        "text": normalized,
        "skills": skills[:30],
        "word_count": len(normalized.split()),
    }


def analyze_resume(file_storage, experience: str = "", education: str = "", location: str = "") -> dict:
    text = extract_text_from_pdf(file_storage)
    summary = summarize_resume(text)
    skill_text = " ".join(summary["skills"]) or summary["text"]
    jobs = recommend_jobs(skill_text, education=education, experience=experience, location=location, top_n=5)
    gap = skill_gap_for_jobs(skill_text, jobs)
    return {
        "resume": summary,
        "recommendations": jobs,
        "skill_gap": gap,
        "roadmap": build_roadmap(skill_text, jobs),
    }
