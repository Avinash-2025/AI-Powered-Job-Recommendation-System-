"""Flask API for the AI-Powered Job Recommendation System."""

from __future__ import annotations

import os

from flask import Flask, jsonify, request

from chatbot import chat_response
from database import (
    applied_job_ids,
    apply_job,
    authenticate,
    create_user,
    get_user_by_token,
    init_db,
    save_job,
    saved_job_ids,
    unapply_job,
    unsave_job,
    update_profile,
)
from recommender import build_roadmap, dataset_summary, get_skill_vocabulary, jobs_by_ids, recommend_jobs, search_jobs, skill_gap_for_jobs
from resume_parser import analyze_resume


app = Flask(__name__)
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


def current_user() -> dict | None:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else None
    return get_user_by_token(token)


@app.route("/api/health", methods=["GET"])
def health():
    summary = dataset_summary()
    return jsonify(
        {
            "status": "ok",
            "engine": "TF-IDF + Cosine Similarity",
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
    top_n = int(data.get("top_n") or 5)

    if not skills:
        return jsonify({"error": "Please provide skills or complete your profile."}), 400

    recommendations = recommend_jobs(skills, education, experience, location, top_n)
    roadmap = build_roadmap(skills, recommendations, data.get("target_role", ""))
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
    target_role = data.get("target_role", "")

    if not skills:
        return jsonify({"error": "Please provide skills before generating a roadmap."}), 400

    recommendations = recommend_jobs(skills, education, experience, location, 5)
    return jsonify({
        "roadmap": build_roadmap(skills, recommendations, target_role),
        "skill_gap": skill_gap_for_jobs(skills, recommendations),
    })


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

    if user:
        update_profile(
            user["id"],
            {
                **profile_data,
                "skills": " ".join(analysis["resume"]["skills"]) or profile_data.get("skills", ""),
                "resume_text": analysis["resume"]["text"],
            },
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
