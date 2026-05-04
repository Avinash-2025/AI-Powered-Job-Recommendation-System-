"""Career-facing service helpers used by Flask routes."""

from __future__ import annotations


def build_job_alerts(recommendations: list[dict], threshold: int = 65) -> list[dict]:
    return [
        {
            "id": job["id"],
            "title": job["title"],
            "company": job["company"],
            "match": job["match"],
            "message": f"{job['title']} matches your profile at {job['match']}%.",
        }
        for job in recommendations
        if int(job.get("match", 0)) >= threshold
    ]


def interview_preparation(role: str, skills: str) -> dict:
    target_role = (role or "your target role").strip()
    focus = [skill.strip() for skill in str(skills or "").replace(";", ",").split(",") if skill.strip()]
    focus = focus[:4] or ["your projects", "problem solving", "communication"]
    questions = [
        f"Tell me about a project where you used {focus[0]}.",
        f"How would you explain {focus[1] if len(focus) > 1 else focus[0]} to a beginner?",
        f"What makes you interested in the {target_role} role?",
        "Describe a time you solved a difficult technical problem.",
        "How do you prioritize learning when a job requires new skills?",
    ]
    tips = [
        "Prepare a 60-second intro with your strongest skills.",
        "Map each resume project to one job requirement.",
        "Practice one technical answer and one behavioral answer daily.",
    ]
    return {"role": target_role, "questions": questions, "tips": tips}
