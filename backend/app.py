"""Flask API for the AI-Powered Job Recommendation System."""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, request

from chatbot import chat_response
from database import (
    applied_job_ids,
    apply_job,
    authenticate,
    create_job,
    create_recruiter_job,
    create_user,
    delete_job,
    get_user_by_token,
    init_db,
    list_jobs as list_dynamic_jobs,
    list_recruiter_jobs,
    list_shortlisted_candidates,
    save_job,
    saved_job_ids,
    search_candidates,
    shortlist_candidate,
    unapply_job,
    unsave_job,
    update_job,
    update_profile,
)
from dynamic_recommender import build_roadmap, dataset_summary, get_skill_vocabulary, invalidate_job_cache, jobs_by_ids, recommend_jobs, search_jobs, skill_gap_for_jobs
from resume_parser import analyze_resume
from services.career_service import build_job_alerts, interview_preparation


app = Flask(__name__)


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "jobfinder-admin-token")
init_db()

ALLOWED_ORIGINS = {
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
}


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.route("/api/<path:_path>", methods=["OPTIONS"])
def options(_path):
    return ("", 204)

from flask import render_template

@app.route("/")
def home():
    return render_template("index.html")

def current_user() -> dict | None:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else None
    return get_user_by_token(token)


def is_admin_request() -> bool:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    return token == ADMIN_TOKEN


@app.route("/api/health", methods=["GET"])
def health():
    summary = dataset_summary()
    return jsonify(
        {
            "status": "ok",
            "engine": "TF-IDF + KNN",
            "jobs": summary["jobs"],
            "source": summary["source"],
            "dataset_file": summary["dataset_file"],
            "database": "SQLite",
        }
    )


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    try:
        session = create_user(data.get("name", ""), data.get("email", ""), data.get("password", ""))
        return jsonify(session), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(authenticate(data.get("email", ""), data.get("password", "")))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 401


@app.route("/api/profile", methods=["GET", "PUT"])
def profile():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if request.method == "GET":
        return jsonify({
            "user": user,
            "saved_job_ids": saved_job_ids(user["id"]),
            "applied_job_ids": applied_job_ids(user["id"]),
        })

    data = request.get_json(silent=True) or {}
    updated = update_profile(user["id"], data)
    return jsonify({"user": updated})


@app.route("/api/jobs", methods=["GET"])
def jobs():
    try:
        payload = search_jobs(
            keyword=request.args.get("q", ""),
            location=request.args.get("location", ""),
            role=request.args.get("role", ""),
            min_salary=int(request.args.get("min_salary", "0") or 0),
            limit=min(int(request.args.get("limit", "50") or 50), 100),
            offset=max(int(request.args.get("offset", "0") or 0), 0),
        )
    except ValueError:
        return jsonify({"error": "Invalid listing filter value."}), 400
    return jsonify(payload)


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("username") == ADMIN_USERNAME and data.get("password") == ADMIN_PASSWORD:
        return jsonify({"token": ADMIN_TOKEN, "username": ADMIN_USERNAME})
    return jsonify({"error": "Invalid admin username or password."}), 401


@app.route("/api/admin/jobs", methods=["GET", "POST"])
def admin_jobs():
    if not is_admin_request():
        return jsonify({"error": "Admin login required."}), 401
    if request.method == "GET":
        jobs_list = list_dynamic_jobs(limit=500)
        return jsonify({"jobs": jobs_list, "total": len(jobs_list)})
    try:
        job = create_job(request.get_json(silent=True) or {})
        invalidate_job_cache()
        return jsonify({"job": job}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/admin/jobs/<int:job_id>", methods=["PUT", "DELETE"])
def admin_job_detail(job_id: int):
    if not is_admin_request():
        return jsonify({"error": "Admin login required."}), 401
    try:
        if request.method == "DELETE":
            delete_job(job_id)
            invalidate_job_cache()
            return jsonify({"deleted": True})
        job = update_job(job_id, request.get_json(silent=True) or {})
        invalidate_job_cache()
        return jsonify({"job": job})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@app.route("/api/skills", methods=["GET"])
def skills():
    return jsonify({"skills": sorted(get_skill_vocabulary())})


@app.route("/api/recommend", methods=["POST"])
def recommend():
    data = request.get_json(silent=True) or {}
    user = current_user()
    profile_data = (user or {}).get("profile", {})

    skills = (data.get("skills") or profile_data.get("skills") or "").strip()
    education = (data.get("education") or profile_data.get("education") or "").strip()
    experience = (data.get("experience") or profile_data.get("experience") or "").strip()
    location = (data.get("location") or profile_data.get("location") or "").strip()
    preferred_role = (data.get("preferred_role") or profile_data.get("preferred_role") or "").strip()
    salary_expectation = (data.get("salary_expectation") or profile_data.get("salary_expectation") or "").strip()
    top_n = int(data.get("top_n") or 5)

    if not any([skills, education, experience, location, preferred_role, salary_expectation]):
        return jsonify({"error": "Please provide skills or preferences first."}), 400

    recommendations = recommend_jobs(
        skills,
        education,
        experience,
        location,
        top_n,
        preferred_role=preferred_role,
        salary_expectation=salary_expectation,
    )
    roadmap = build_roadmap(skills, recommendations, data.get("target_role", preferred_role))
    return jsonify(
        {
            "jobs": recommendations,
            "total": len(recommendations),
            "skill_gap": skill_gap_for_jobs(skills, recommendations),
            "roadmap": roadmap,
            "query": {
                "skills": skills,
                "education": education,
                "experience": experience,
                "location": location,
                "preferred_role": preferred_role,
                "salary_expectation": salary_expectation,
            },
        }
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    return jsonify(chat_response(data.get("message", ""), current_user()))


@app.route("/api/roadmap", methods=["POST"])
def roadmap():
    data = request.get_json(silent=True) or {}
    user = current_user()
    profile_data = (user or {}).get("profile", {})
    skills = (data.get("skills") or profile_data.get("skills") or "").strip()
    education = (data.get("education") or profile_data.get("education") or "").strip()
    experience = (data.get("experience") or profile_data.get("experience") or "").strip()
    location = (data.get("location") or profile_data.get("location") or "").strip()
    target_role = data.get("target_role", profile_data.get("preferred_role", ""))

    roadmap_query = skills or target_role
    if not roadmap_query:
        return jsonify({"error": "Please provide skills or a dream role before generating a roadmap."}), 400

    recommendations = recommend_jobs(roadmap_query, education, experience, location, 5, preferred_role=target_role)
    return jsonify({
        "roadmap": build_roadmap(skills, recommendations, target_role),
        "skill_gap": skill_gap_for_jobs(skills, recommendations),
    })


@app.route("/api/job-alerts", methods=["GET"])
def job_alerts():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    profile_data = user.get("profile", {})
    recommendations = recommend_jobs(
        profile_data.get("skills", ""),
        profile_data.get("education", ""),
        profile_data.get("experience", ""),
        profile_data.get("location", ""),
        5,
        preferred_role=profile_data.get("preferred_role", ""),
        salary_expectation=profile_data.get("salary_expectation", ""),
    )
    return jsonify({"alerts": build_job_alerts(recommendations)})


@app.route("/api/interview-prep", methods=["POST"])
def interview_prep():
    data = request.get_json(silent=True) or {}
    return jsonify(interview_preparation(data.get("role", ""), data.get("skills", "")))


@app.route("/api/recruiter/jobs", methods=["GET", "POST"])
def recruiter_jobs():
    user = current_user()
    if request.method == "GET":
        return jsonify({"jobs": list_recruiter_jobs(user["id"] if user else None)})
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    data = request.get_json(silent=True) or {}
    if not str(data.get("title", "")).strip():
        return jsonify({"error": "Job title is required."}), 400
    job = create_recruiter_job(user["id"], data)
    return jsonify({"job": job}), 201


@app.route("/api/recruiter/candidates", methods=["GET"])
def recruiter_candidates():
    query = request.args.get("q", "")
    return jsonify({"candidates": search_candidates(query)})


@app.route("/api/recruiter/shortlist", methods=["GET", "POST"])
def recruiter_shortlist():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    if request.method == "GET":
        return jsonify({"candidates": list_shortlisted_candidates(user["id"])})
    data = request.get_json(silent=True) or {}
    candidate_id = int(data.get("candidate_id") or 0)
    if not candidate_id:
        return jsonify({"error": "candidate_id is required."}), 400
    job_id = int(data.get("job_id") or 0) or None
    return jsonify({"candidates": shortlist_candidate(user["id"], candidate_id, job_id)})


@app.route("/api/upload", methods=["POST"])
def upload_resume():
    if "resume" not in request.files:
        return jsonify({"error": "Upload a resume PDF or TXT file using the 'resume' field."}), 400

    user = current_user()
    profile_data = (user or {}).get("profile", {})
    analysis = analyze_resume(
        request.files["resume"],
        experience=request.form.get("experience", profile_data.get("experience", "")),
        education=request.form.get("education", profile_data.get("education", "")),
        location=request.form.get("location", profile_data.get("location", "")),
    )

    return jsonify(analysis)


@app.route("/api/saved-jobs/<int:job_id>", methods=["POST", "DELETE"])
def saved_jobs(job_id: int):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if request.method == "POST":
        save_job(user["id"], job_id)
    else:
        unsave_job(user["id"], job_id)
    return jsonify({"saved_job_ids": saved_job_ids(user["id"])})


@app.route("/api/saved-jobs", methods=["GET"])
def saved_job_list():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    ids = saved_job_ids(user["id"])
    return jsonify({"job_ids": ids, "jobs": jobs_by_ids(ids)})


@app.route("/api/applied-jobs", methods=["GET"])
def applied_job_list():
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401
    ids = applied_job_ids(user["id"])
    return jsonify({"job_ids": ids, "jobs": jobs_by_ids(ids)})


@app.route("/api/applied-jobs/<int:job_id>", methods=["POST", "DELETE"])
def applied_jobs(job_id: int):
    user = current_user()
    if not user:
        return jsonify({"error": "Authentication required."}), 401

    if request.method == "POST":
        apply_job(user["id"], job_id)
    else:
        unapply_job(user["id"], job_id)
    return jsonify({"applied_job_ids": applied_job_ids(user["id"])})


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG") == "1"
    print("[*] Job Recommendation API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=debug, use_reloader=False)
