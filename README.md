# Job Recommendation System

Simple full-stack job recommendation website with a separate login/sign-up page, real job data, resume analysis, and a Gemini-powered career chatbot.

## Features

- Login and sign-up first screen
- User profile: skills, education, experience, location
- Top 5 job recommendations using TF-IDF + cosine similarity
- Clean job search UI
- Save and apply jobs
- Resume upload: PDF or TXT
- Skill tips from missing skills
- Career assistant chatbot
- Gemini API support through backend `GEMINI_API_KEY`

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Python Flask
- Database: SQLite
- ML: TF-IDF + cosine similarity
- Dataset: real job postings CSV from Hugging Face

## Gemini Chatbot Setup

Create:

```text
backend/.env
```

Add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Restart Flask after adding the key. If the key is missing, the chatbot uses the local fallback assistant.

## Run Project

```powershell
cd "E:\Tharun\CSE-274\Job Recommendation\dream-job-finder"
powershell.exe -ExecutionPolicy Bypass -File .\run-dev.ps1
```

Frontend: `http://localhost:8080`

Backend health: `http://localhost:5000/api/health`
