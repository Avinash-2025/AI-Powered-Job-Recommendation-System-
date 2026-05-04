"""Rule-based career chatbot powered by the same recommender data."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from dynamic_recommender import build_roadmap, extract_known_skills, recommend_jobs, skill_gap_for_jobs


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
    "digital marketing": "Google Digital Garage fundamentals",
    "sales": "HubSpot Sales Software certification",
    "accounting": "Excel accounting basics and Tally practice",
    "customer support": "Zendesk customer service training",
    "content writing": "HubSpot content marketing certification",
}

NON_TECH_KEYWORDS = {
    "marketing": "digital marketing seo social media content writing communication",
    "sales": "sales communication negotiation crm customer relationship",
    "hr": "human resources recruitment communication employee relations",
    "accounting": "accounting excel tally finance bookkeeping",
    "support": "customer support communication troubleshooting service",
    "teaching": "teaching communication curriculum training",
    "design": "graphic design figma photoshop creativity",
    "writer": "content writing seo communication editing",
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


def _gemini_reply(message: str, jobs: list[dict], gap: dict, roadmap: list[dict], profile_data: dict) -> str | None:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    job_context = [
        {
            "title": job.get("title"),
            "company": job.get("company"),
            "match": job.get("match"),
            "matched_skills": job.get("matched_skills", [])[:5],
            "missing_skills": job.get("missing_skills", [])[:5],
        }
        for job in jobs[:3]
    ]
    prompt = f"""
You are a concise career assistant inside a job recommendation website.
Answer in simple language. Keep the answer under 120 words.
Do not invent job applications or fake links.
Follow the user's request directly. If they ask for jobs, recommend jobs.
If they ask where to upload resume or edit skills, tell them to open the Profile page.
Support technical and non-technical roles.

User profile:
skills: {profile_data.get("skills", "")}
education: {profile_data.get("education", "")}
experience: {profile_data.get("experience", "")}
location: {profile_data.get("location", "")}

Top recommended jobs:
{json.dumps(job_context, ensure_ascii=False)}

Skill gap:
{json.dumps(gap, ensure_ascii=False)}

Roadmap:
{json.dumps(roadmap, ensure_ascii=False)}

User message: {message}
"""
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 220,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=float(os.environ.get("GEMINI_TIMEOUT_SECONDS", "8"))) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    candidates = data.get("candidates", [])
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    return text or None


def chat_response(message: str, user_profile: dict | None = None) -> dict:
    text = (message or "").strip()
    profile = user_profile or {}
    profile_data = profile.get("profile", profile)
    known_skills = profile_data.get("skills", "")
    education = profile_data.get("education", "")
    experience = profile_data.get("experience", "")
    location = profile_data.get("location", "")
    detected_skills = extract_known_skills(text)
    requested_area = ""
    lowered = text.lower()
    for keyword, expanded in NON_TECH_KEYWORDS.items():
        if keyword in lowered:
            requested_area = expanded
            break
    skill_text = " ".join(detected_skills) or requested_area or (text if any(term in lowered for term in ("job", "role", "career", "learn", "skill", "roadmap", "marketing", "sales", "hr", "accounting", "support", "design", "writer")) else known_skills)

    if not text:
        return {"reply": GREETING, "jobs": [], "suggested_skills": []}

    jobs = recommend_jobs(skill_text, education=education, experience=experience, location=location, top_n=5) if skill_text else []
    gap = skill_gap_for_jobs(skill_text, jobs) if jobs else {"missing": [], "matched": []}
    roadmap = build_roadmap(skill_text, jobs, requested_area or profile_data.get("preferred_role", "")) if skill_text else []

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
            reply = "Open Resume Upload. I will extract resume skills, recommend jobs from those skills, and keep your profile skills unchanged."
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

    gemini_text = _gemini_reply(text, jobs, gap, roadmap, profile_data)
    if gemini_text:
        reply = gemini_text

    return {
        "reply": reply,
        "provider": "gemini" if gemini_text else "local",
        "jobs": jobs[:3],
        "suggested_skills": gap["missing"][:8],
        "suggested_courses": _course_suggestions(gap["missing"]),
        "detected_skills": detected_skills,
        "roadmap": roadmap,
    }
