"""SQLite helpers for users, profiles, uploaded resumes, saved jobs, and applications."""

from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import secrets
import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "job_recommender.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              salt TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS profiles (
              user_id INTEGER PRIMARY KEY,
              skills TEXT DEFAULT '',
              education TEXT DEFAULT '',
              experience TEXT DEFAULT '',
              location TEXT DEFAULT '',
              resume_text TEXT DEFAULT '',
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id INTEGER NOT NULL,
              expires_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS saved_jobs (
              user_id INTEGER NOT NULL,
              job_id INTEGER NOT NULL,
              saved_at TEXT NOT NULL,
              PRIMARY KEY (user_id, job_id),
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS applied_jobs (
              user_id INTEGER NOT NULL,
              job_id INTEGER NOT NULL,
              status TEXT NOT NULL DEFAULT 'Applied',
              applied_at TEXT NOT NULL,
              PRIMARY KEY (user_id, job_id),
              FOREIGN KEY (user_id) REFERENCES users(id)
            );
            """
        )


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()


def create_user(name: str, email: str, password: str) -> dict:
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")

    now = datetime.utcnow().isoformat()
    salt = secrets.token_hex(16)
    password_hash = _hash_password(password, salt)

    try:
        with get_db() as conn:
            cursor = conn.execute(
                """
                INSERT INTO users (name, email, password_hash, salt, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (name.strip(), email.strip().lower(), password_hash, salt, now),
            )
            user_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO profiles (user_id, updated_at) VALUES (?, ?)",
                (user_id, now),
            )
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with this email already exists.") from exc

    return create_session(int(user_id))


def authenticate(email: str, password: str) -> dict:
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()

    if not user or _hash_password(password, user["salt"]) != user["password_hash"]:
        raise ValueError("Invalid email or password.")

    return create_session(int(user["id"]))


def create_session(user_id: int) -> dict:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )

    user = get_user(user_id)
    return {"token": token, "user": user}


def get_user(user_id: int) -> dict:
    with get_db() as conn:
        user = conn.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        profile = conn.execute(
            "SELECT skills, education, experience, location, resume_text FROM profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if not user:
        raise ValueError("User not found.")

    return {
        **dict(user),
        "profile": dict(profile) if profile else {},
    }


def get_user_by_token(token: str | None) -> dict | None:
    if not token:
        return None

    with get_db() as conn:
        session = conn.execute(
            "SELECT user_id, expires_at FROM sessions WHERE token = ?",
            (token,),
        ).fetchone()

    if not session:
        return None

    if datetime.fromisoformat(session["expires_at"]) < datetime.utcnow():
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None

    return get_user(int(session["user_id"]))


def update_profile(user_id: int, profile: dict) -> dict:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        current = conn.execute(
            "SELECT skills, education, experience, location, resume_text FROM profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        current_data = dict(current) if current else {}
        merged = {
            "skills": profile.get("skills", current_data.get("skills", "")),
            "education": profile.get("education", current_data.get("education", "")),
            "experience": profile.get("experience", current_data.get("experience", "")),
            "location": profile.get("location", current_data.get("location", "")),
            "resume_text": profile.get("resume_text", current_data.get("resume_text", "")),
        }
        conn.execute(
            """
            INSERT INTO profiles (user_id, skills, education, experience, location, resume_text, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              skills = excluded.skills,
              education = excluded.education,
              experience = excluded.experience,
              location = excluded.location,
              resume_text = excluded.resume_text,
              updated_at = excluded.updated_at
            """,
            (
                user_id,
                merged["skills"],
                merged["education"],
                merged["experience"],
                merged["location"],
                merged["resume_text"],
                now,
            ),
        )

    return get_user(user_id)


def save_job(user_id: int, job_id: int) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO saved_jobs (user_id, job_id, saved_at) VALUES (?, ?, ?)",
            (user_id, job_id, datetime.utcnow().isoformat()),
        )


def unsave_job(user_id: int, job_id: int) -> None:
    with get_db() as conn:
        conn.execute(
            "DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?",
            (user_id, job_id),
        )


def saved_job_ids(user_id: int) -> list[int]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT job_id FROM saved_jobs WHERE user_id = ? ORDER BY saved_at DESC",
            (user_id,),
        ).fetchall()
    return [int(row["job_id"]) for row in rows]


def apply_job(user_id: int, job_id: int) -> None:
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO applied_jobs (user_id, job_id, status, applied_at)
            VALUES (?, ?, 'Applied', ?)
            ON CONFLICT(user_id, job_id) DO UPDATE SET
              status = 'Applied',
              applied_at = excluded.applied_at
            """,
            (user_id, job_id, datetime.utcnow().isoformat()),
        )


def unapply_job(user_id: int, job_id: int) -> None:
    with get_db() as conn:
        conn.execute(
            "DELETE FROM applied_jobs WHERE user_id = ? AND job_id = ?",
            (user_id, job_id),
        )


def applied_job_ids(user_id: int) -> list[int]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT job_id FROM applied_jobs WHERE user_id = ? ORDER BY applied_at DESC",
            (user_id,),
        ).fetchall()
    return [int(row["job_id"]) for row in rows]
