"""Resume PDF parser and skill-gap analyzer."""

from __future__ import annotations

import io
import re

from recommender import build_roadmap, extract_known_skills, recommend_jobs, skill_gap_for_jobs

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    try:
        from PyPDF2 import PdfReader
    except Exception:
        PdfReader = None


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
    skills = extract_known_skills(normalized)
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
