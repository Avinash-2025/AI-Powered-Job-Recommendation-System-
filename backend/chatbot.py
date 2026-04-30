"""Rule-based career chatbot powered by the same recommender data."""

from __future__ import annotations

from recommender import build_roadmap, extract_known_skills, recommend_jobs, skill_gap_for_jobs


GREETING = (
    "Hi, I can help with job matches, resume skill gaps, and learning plans. "
    "Tell me your skills or ask what to learn next."
)

COURSE_HINTS = {
    "python": "Python for Everybody or Kaggle Python",
    "sql": "Mode SQL Tutorial or Khan Academy SQL",
    "machine learning": "Google Machine Learning Crash Course",
    "deep learning": "fast.ai Practical Deep Learning",
    "pandas": "Kaggle Pandas micro-course",
    "react": "React official docs tutorial",
    "typescript": "TypeScript Handbook",
    "aws": "AWS Skill Builder Cloud Practitioner",
    "docker": "Docker getting started guide",
    "kubernetes": "Kubernetes official basics",
    "communication skills": "LinkedIn Learning communication fundamentals",
}


def _format_jobs(jobs: list[dict]) -> str:
    if not jobs:
        return "I need a little more skill detail before I can suggest roles."
    lines = [
        f"{index + 1}. {job['title']} at {job['company']} ({job['match']}% match)"
        for index, job in enumerate(jobs[:3])
    ]
    return "Top roles for you:\n" + "\n".join(lines)


def _course_suggestions(skills: list[str]) -> list[str]:
    suggestions = []
    for skill in skills[:6]:
        course = COURSE_HINTS.get(skill)
        suggestions.append(f"{skill}: {course or 'build a focused project and follow official documentation'}")
    return suggestions


def chat_response(message: str, user_profile: dict | None = None) -> dict:
    text = (message or "").strip()
    profile = user_profile or {}
    profile_data = profile.get("profile", profile)
    known_skills = profile_data.get("skills", "")
    education = profile_data.get("education", "")
    experience = profile_data.get("experience", "")
    location = profile_data.get("location", "")
    detected_skills = extract_known_skills(text)
    skill_text = " ".join(detected_skills) or known_skills

    if not text:
        return {"reply": GREETING, "jobs": [], "suggested_skills": []}

    lowered = text.lower()
    jobs = recommend_jobs(skill_text, education=education, experience=experience, location=location, top_n=5) if skill_text else []
    gap = skill_gap_for_jobs(skill_text, jobs) if jobs else {"missing": [], "matched": []}
    roadmap = build_roadmap(skill_text, jobs) if jobs else []

    if any(term in lowered for term in ("job", "role", "recommend", "match", "career")):
        reply = _format_jobs(jobs)
    elif any(term in lowered for term in ("learn", "skill", "gap", "improve", "missing")):
        if gap["missing"]:
            reply = "Skills to learn next: " + ", ".join(gap["missing"][:6]) + "."
        else:
            reply = "Your listed skills already align well. Add a target role so I can find deeper gaps."
    elif any(term in lowered for term in ("roadmap", "plan", "path")):
        if roadmap:
            reply = "Roadmap: " + " -> ".join(step["title"] for step in roadmap)
        else:
            reply = "Share your skills first, then I can build a career roadmap."
    elif any(term in lowered for term in ("resume", "cv")):
        reply = "Upload your resume PDF or TXT file in the dashboard and I will extract skills, recommend jobs, and show missing skills."
    elif any(term in lowered for term in ("course", "courses", "certification", "study")):
        courses = _course_suggestions(gap["missing"])
        reply = "Suggested learning resources:\n" + "\n".join(courses) if courses else "Share your target role or skills so I can suggest courses."
    elif any(term in lowered for term in ("hello", "hi", "hey")):
        reply = GREETING
    else:
        if detected_skills:
            reply = _format_jobs(jobs)
        else:
            reply = (
                "For career guidance, share your skills, target role, or resume. "
                "Example: I know Python SQL and machine learning."
            )

    return {
        "reply": reply,
        "jobs": jobs[:3],
        "suggested_skills": gap["missing"][:8],
        "suggested_courses": _course_suggestions(gap["missing"]),
        "detected_skills": detected_skills,
        "roadmap": roadmap,
    }
