# AI-Powered Job Recommendation System with Chatbot

Full-stack React + Flask application that recommends jobs using TF-IDF cosine similarity, analyzes resumes, stores users in SQLite, and includes a career guidance chatbot.

## Features

- Register and login with SQLite-backed users
- Store candidate skills, education, experience, and location
- Update profile anytime from the dashboard
- Browse all available jobs with keyword, role, location, and salary filters
- ML job recommendation from a real public job-posting CSV
- TF-IDF vectorization and cosine similarity with scikit-learn
- Pure-Python fallback when ML packages are not installed
- Resume PDF/TXT upload and skill extraction
- Skill-gap analysis against the top recommended jobs
- Career roadmap generated from real missing-skill patterns
- Career chatbot for role suggestions and learning guidance
- Save and unsave recommended jobs
- Track applied jobs
- Dashboard charts for match scores and skills vs jobs

## Project Structure

```text
backend/
  app.py
  chatbot.py
  database.py
  recommender.py
  resume_parser.py
  prepare_dataset.py
  requirements.txt
  dataset/real_job_postings.csv
  dataset/jobs_real_enriched.csv
  dataset/jobs.csv

src/
  components/
    AuthPanel.tsx
    CareerChatbot.tsx
    ProfileForm.tsx
    RecommendationCard.tsx
    ResumeAnalyzer.tsx
    SkillGapPanel.tsx
  lib/api.ts
  pages/Index.tsx
```

## Backend Setup

```powershell
cd "E:\Tharun\CSE-274\Job Recommendation\dream-job-finder"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python backend\app.py
```

Backend URL: `http://localhost:5000`

## Real Dataset

The app uses the Hugging Face dataset `will4381/job-posting-classification`, a real CSV dataset with about 33k job postings and fields such as `company_name`, `job_position`, `relevant_skills`, `required_qualifications`, `job_responsibilities`, `salary_range`, and `employment_type`.

Downloaded raw CSV:

```text
backend/dataset/real_job_postings.csv
```

Compact normalized CSV used by the app:

```text
backend/dataset/jobs_real_enriched.csv
```

To rebuild the normalized CSV after replacing the raw dataset:

```powershell
python backend\prepare_dataset.py
```

## Frontend Setup

Open a second terminal:

```powershell
cd "E:\Tharun\CSE-274\Job Recommendation\dream-job-finder"
npm install
npm run dev
```

Frontend URL: `http://localhost:8080`

## One-Command Local Start

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\run-dev.ps1
```

## API Endpoints

- `POST /api/register`
- `POST /api/login`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/recommend`
- `POST /api/chat`
- `POST /api/upload`
- `POST /api/roadmap`
- `GET /api/jobs?q=&location=&role=&min_salary=&limit=&offset=`
- `GET /api/skills`
- `GET /api/saved-jobs`
- `POST /api/saved-jobs/<job_id>`
- `DELETE /api/saved-jobs/<job_id>`
- `GET /api/applied-jobs`
- `POST /api/applied-jobs/<job_id>`
- `DELETE /api/applied-jobs/<job_id>`

## Sample Recommendation Request

```json
{
  "skills": "python sql machine learning",
  "education": "Bachelor",
  "experience": "1-3 years",
  "location": "Remote",
  "top_n": 5
}
```

The response includes:

- `jobs`: top 5 recommended jobs
- `skill_gap`: matched and missing skills
- `roadmap`: 3-phase learning and portfolio roadmap
