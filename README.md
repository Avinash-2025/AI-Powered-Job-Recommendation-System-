<p align="center">
  <h1 align="center">🚀 Dream Job Finder</h1>
  <p align="center">
    <strong>AI-Powered Job Recommendation System with Resume Analysis & Career Chatbot</strong>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="#project-structure">Project Structure</a>
  </p>
</p>

---

## 📋 Overview

**Dream Job Finder** is a full-stack, AI-powered job recommendation platform built as a final project for **CSE-274**. It uses **TF-IDF vectorization** and **K-Nearest Neighbors (KNN)** to match candidates with relevant job postings from a real-world dataset of **46,000+ job listings** sourced from Hugging Face. The platform features user authentication, resume parsing, skill-gap analysis, a personalized career roadmap generator, and an intelligent chatbot powered by **Google Gemini**.

---

## ✨ Features

### 🔐 Authentication & Profiles
- Secure user registration and login with salted password hashing
- Persistent session management with token-based auth
- Detailed user profiles: skills, education, experience, preferred role, salary expectations, certifications

### 🎯 Smart Job Recommendations
- **TF-IDF + KNN** hybrid recommendation engine
- Personalized match scores based on skills, education, experience, and location
- Salary-aware filtering and role-based preference weighting
- Skill alias normalization (e.g., `js` → `javascript`, `k8s` → `kubernetes`)

### 📄 Resume Analyzer
- Upload **PDF** or **TXT** resumes for automatic skill extraction
- Vocabulary-aware parsing against 100+ known skills
- Instant job recommendations based on extracted resume content
- Skill-gap report comparing your resume to top-matched jobs

### 🗺️ Career Roadmap
- Auto-generated learning roadmap based on current skills and target role
- Categorized into Foundation → Core → Advanced → Specialization phases
- Estimated time-to-learn for each skill
- Curated course recommendations (Coursera, Kaggle, Google, HubSpot, etc.)

### 🤖 Career Chatbot
- **Google Gemini API** integration for intelligent career conversations
- Context-aware responses using your profile and job market data
- Rule-based fallback when Gemini API key is not configured
- Supports skill queries, job matching, learning plans, and career advice

### 💼 Job Management
- Browse, search, and filter 46,000+ real job listings
- Save and apply to jobs with tracked application status
- Admin panel for full CRUD operations on job listings
- Recruiter panel: post jobs, search candidates, shortlist applicants

### 📊 Dashboard & Analytics
- Dashboard with trending jobs and personalized job alerts
- Skill-gap visualization panel
- Interview preparation module with tailored questions and tips
- Application tracking for saved and applied jobs

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** (Radix UI) | Accessible component primitives |
| **React Router v6** | Client-side routing |
| **TanStack Query** | Server state management |
| **Recharts** | Data visualization / charts |
| **Lucide React** | Icon library |
| **Zod** | Schema validation |
| **React Hook Form** | Form state management |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.10+** | Server-side language |
| **Flask** | Lightweight web framework |
| **SQLite** | Embedded relational database |
| **scikit-learn** | TF-IDF vectorization & KNN |
| **pandas / NumPy** | Data processing & manipulation |
| **NLTK** | Natural language processing |
| **PyPDF** | PDF resume text extraction |
| **Google Gemini API** | AI-powered chatbot |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │   Auth   │ │  Profile │ │ Job Board │ │ Resume Analyzer  │  │
│  │  Panel   │ │   Form   │ │ & Search  │ │  & Skill Gap     │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │  Career  │ │ Roadmap  │ │  Admin    │ │    Recruiter     │  │
│  │ Chatbot  │ │ Timeline │ │  Panel    │ │     Panel        │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST API
                           │ Vite proxy :8080 → :5000
┌──────────────────────────▼──────────────────────────────────────┐
│                      Backend (Flask :5000)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     REST API Layer                       │   │
│  │  /api/register  /api/login  /api/profile  /api/jobs      │   │
│  │  /api/recommend  /api/chat  /api/upload  /api/roadmap    │   │
│  │  /api/admin/*  /api/recruiter/*  /api/saved-jobs/*       │   │
│  └──────────────┬───────────────────────────┬───────────────┘   │
│                 │                           │                    │
│  ┌──────────────▼──────────┐  ┌─────────────▼──────────────┐   │
│  │   ML Recommendation    │  │     Chatbot Engine          │   │
│  │   Engine               │  │  ┌───────────────────────┐  │   │
│  │  • TF-IDF Vectorizer   │  │  │  Google Gemini API    │  │   │
│  │  • KNN (k=50)          │  │  │  (Primary)            │  │   │
│  │  • Cosine Similarity   │  │  ├───────────────────────┤  │   │
│  │  • Skill-Gap Analysis  │  │  │  Rule-Based Fallback  │  │   │
│  │  • Roadmap Builder     │  │  │  (Secondary)          │  │   │
│  └──────────────┬──────────┘  └─────────────────────────────┘  │
│                 │                                                │
│  ┌──────────────▼──────────────────────────────────────────┐    │
│  │               SQLite Database                           │    │
│  │  users · profiles · sessions · jobs · saved_jobs        │    │
│  │  applied_jobs · recruiter_jobs · shortlisted_candidates │    │
│  └─────────────────────────────────────────────────────────┘    │
│                 │                                                │
│  ┌──────────────▼──────────────────────────────────────────┐    │
│  │          Dataset: jobs_real_normalized.csv (~46MB)       │    │
│  │          46,000+ real job postings from Hugging Face     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### ML Pipeline

```
User Input (skills, education, experience, location, preferred role)
    │
    ▼
┌─────────────────────┐
│  Text Preprocessing │  Normalize aliases, clean text, expand
│  & Skill Expansion  │  related skills using RELATED graph
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TF-IDF Vectorizer  │  Transform job descriptions + user
│                     │  profile into numerical vectors
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  KNN (k=50)         │  Find 50 nearest neighbors from
│  + Cosine Sim       │  46k+ job vectors
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Re-Ranking &       │  Apply location, salary, experience
│  Score Boosting     │  boosting and deduplicate results
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Skill Gap Analysis │  Compare user skills vs. required
│  + Roadmap Builder  │  skills for matched jobs
└─────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | v18+ |
| **npm** | v9+ |
| **Python** | 3.10+ |
| **pip** | Latest |

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/dream-job-finder.git
cd dream-job-finder
```

### 2. Backend Setup

```bash
# Navigate to backend and install Python dependencies
cd backend
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

> **Note:** The Gemini API key is **optional**. If not provided, the chatbot will use a built-in rule-based fallback assistant. Get a free API key at [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Frontend Setup

```bash
# From the project root directory
npm install
```

### 4. Run the Application

#### Option A: One-Command Start (Windows PowerShell)

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\run-dev.ps1
```

This script automatically starts both the Flask backend and Vite dev server.

#### Option B: Manual Start (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

### 5. Access the Application

| Service | URL |
|---|---|
| 🌐 **Frontend** | [http://localhost:8080](http://localhost:8080) |
| ⚙️ **Backend API** | [http://localhost:5000](http://localhost:5000) |
| 💚 **Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) |

### Admin Access

The admin panel is accessible from within the app using:

| Field | Default Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> These can be overridden via `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables.

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Create a new user account |
| `POST` | `/api/login` | Authenticate and receive session token |

### User Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profile` | Get current user profile (requires auth) |
| `PUT` | `/api/profile` | Update profile fields (requires auth) |

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | Search/browse jobs with filters (`q`, `location`, `role`, `min_salary`, `limit`, `offset`) |
| `GET` | `/api/skills` | List all known skills in the vocabulary |

### Recommendations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/recommend` | Get personalized job recommendations |
| `POST` | `/api/roadmap` | Generate a career roadmap |
| `POST` | `/api/chat` | Send a message to the career chatbot |
| `POST` | `/api/upload` | Upload resume (PDF/TXT) for analysis |
| `POST` | `/api/interview-prep` | Get interview prep questions & tips |
| `GET` | `/api/job-alerts` | Get personalized job alerts (requires auth) |

### Saved & Applied Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/saved-jobs` | List saved jobs (requires auth) |
| `POST` | `/api/saved-jobs/:id` | Save a job (requires auth) |
| `DELETE` | `/api/saved-jobs/:id` | Unsave a job (requires auth) |
| `GET` | `/api/applied-jobs` | List applied jobs (requires auth) |
| `POST` | `/api/applied-jobs/:id` | Apply to a job (requires auth) |
| `DELETE` | `/api/applied-jobs/:id` | Withdraw application (requires auth) |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Admin authentication |
| `GET` | `/api/admin/jobs` | List all jobs (admin only) |
| `POST` | `/api/admin/jobs` | Create a new job listing (admin only) |
| `PUT` | `/api/admin/jobs/:id` | Update a job listing (admin only) |
| `DELETE` | `/api/admin/jobs/:id` | Delete a job listing (admin only) |

### Recruiter

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/recruiter/jobs` | List recruiter-posted jobs |
| `POST` | `/api/recruiter/jobs` | Post a new recruiter job (requires auth) |
| `GET` | `/api/recruiter/candidates` | Search candidates by query |
| `GET` | `/api/recruiter/shortlist` | View shortlisted candidates (requires auth) |
| `POST` | `/api/recruiter/shortlist` | Shortlist a candidate (requires auth) |

---

## 📂 Project Structure

```
dream-job-finder/
│
├── 📁 backend/                    # Python Flask backend
│   ├── app.py                     # Flask app & REST API routes
│   ├── database.py                # SQLite ORM (users, jobs, sessions, etc.)
│   ├── recommender.py             # TF-IDF + cosine similarity engine
│   ├── dynamic_recommender.py     # SQLite-backed TF-IDF + KNN recommender
│   ├── chatbot.py                 # Gemini-powered + rule-based chatbot
│   ├── resume_parser.py           # PDF/TXT resume parsing & skill extraction
│   ├── jobs_dataset.py            # Dataset loading & normalization utilities
│   ├── prepare_dataset.py         # CSV preprocessing & enrichment script
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variable template
│   ├── job_recommender.db         # SQLite database (auto-generated)
│   ├── 📁 dataset/
│   │   └── jobs_real_normalized.csv   # 46k+ real job postings (~46 MB)
│   ├── 📁 services/
│   │   └── career_service.py      # Job alerts & interview prep helpers
│   ├── test_api.py                # API endpoint tests
│   ├── test_chatbot.py            # Chatbot unit tests
│   └── test_resume.py             # Resume parser tests
│
├── 📁 src/                        # React frontend source
│   ├── App.tsx                    # Root app with routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles
│   ├── 📁 pages/
│   │   ├── Index.tsx              # Main application page
│   │   └── NotFound.tsx           # 404 page
│   ├── 📁 components/
│   │   ├── AuthPanel.tsx          # Login / Sign-up panel
│   │   ├── ProfileForm.tsx        # User profile editor
│   │   ├── RecommendForm.tsx      # Recommendation input form
│   │   ├── RecommendationCard.tsx # Job recommendation cards
│   │   ├── JobCard.tsx            # Job listing card
│   │   ├── JobListings.tsx        # Job listing grid
│   │   ├── FilterSidebar.tsx      # Search & filter sidebar
│   │   ├── ResumeAnalyzer.tsx     # Resume upload & analysis
│   │   ├── CareerChatbot.tsx      # AI chatbot interface
│   │   ├── RoadmapTimeline.tsx    # Career roadmap visualization
│   │   ├── SkillGapPanel.tsx      # Skill-gap analysis panel
│   │   ├── InterviewPrepPanel.tsx # Interview preparation panel
│   │   ├── DashboardAnalytics.tsx # Dashboard overview
│   │   ├── TrackedJobs.tsx        # Saved & applied jobs tracker
│   │   ├── TrendingJobs.tsx       # Trending jobs section
│   │   ├── AdminPanel.tsx         # Admin job management
│   │   ├── RecruiterPanel.tsx     # Recruiter features
│   │   ├── Header.tsx             # App header / navigation
│   │   ├── Footer.tsx             # App footer
│   │   ├── Hero.tsx               # Landing hero section
│   │   ├── HowItWorks.tsx         # How it works section
│   │   └── 📁 ui/                 # shadcn/ui primitives
│   ├── 📁 hooks/                  # Custom React hooks
│   ├── 📁 lib/                    # Utility functions
│   ├── 📁 data/                   # Static data / constants
│   └── 📁 test/                   # Frontend tests (Vitest)
│
├── 📁 public/                     # Static assets
├── index.html                     # HTML entry point
├── package.json                   # Node.js dependencies & scripts
├── vite.config.ts                 # Vite configuration (proxy :8080 → :5000)
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Vitest test configuration
├── run-dev.ps1                    # PowerShell dev startup script
├── start.bat                      # Batch dev startup script
└── .gitignore                     # Git ignore rules
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
python -m pytest test_api.py test_chatbot.py test_resume.py -v
```

### Frontend Tests

```bash
# Run once
npm run test

# Watch mode
npm run test:watch
```

---

## 🗄️ Database Schema

The SQLite database (`job_recommender.db`) is auto-created on first run with the following tables:

| Table | Description |
|---|---|
| `users` | User accounts (name, email, hashed password, salt) |
| `profiles` | User profiles (skills, education, experience, preferred role, etc.) |
| `sessions` | Active session tokens with expiration |
| `jobs` | Admin-managed job listings |
| `saved_jobs` | User's bookmarked jobs |
| `applied_jobs` | User's job applications with status tracking |
| `recruiter_jobs` | Jobs posted by recruiters |
| `shortlisted_candidates` | Recruiter's shortlisted candidates |

---

## 🔑 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI chatbot |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model to use |
| `ADMIN_USERNAME` | No | `admin` | Admin panel username |
| `ADMIN_PASSWORD` | No | `admin123` | Admin panel password |
| `ADMIN_TOKEN` | No | `jobfinder-admin-token` | Admin bearer token |
| `FLASK_DEBUG` | No | `0` | Set to `1` for Flask debug mode |

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run frontend tests (Vitest) |
| `npm run test:watch` | Run frontend tests in watch mode |
| `python backend/app.py` | Start Flask API server on port 5000 |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** your changes: `git commit -m "Add your feature"`
4. **Push** to the branch: `git push origin feature/your-feature`
5. **Open** a Pull Request

---

## 📄 License

This project was developed as a course project for **CSE-274** and is available for educational purposes.

---

<p align="center">
  Built with ❤️ using React, Flask, and scikit-learn
</p>
