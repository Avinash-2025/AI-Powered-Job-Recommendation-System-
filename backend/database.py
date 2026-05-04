"""SQLite helpers for users, profiles, recruiter jobs, saved jobs, and applications."""

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
              branch TEXT DEFAULT '',
              university TEXT DEFAULT '',
              experience TEXT DEFAULT '',
              roles TEXT DEFAULT '',
              certifications TEXT DEFAULT '',
              preferred_role TEXT DEFAULT '',
              location TEXT DEFAULT '',
              salary_expectation TEXT DEFAULT '',
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

            CREATE TABLE IF NOT EXISTS jobs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              company TEXT NOT NULL,
              skills TEXT NOT NULL,
              experience TEXT DEFAULT '',
              salary TEXT DEFAULT '',
              location TEXT DEFAULT '',
              description TEXT DEFAULT '',
              job_type TEXT DEFAULT 'Full-time',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS recruiter_jobs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              recruiter_user_id INTEGER,
              title TEXT NOT NULL,
              company TEXT NOT NULL,
              location TEXT DEFAULT '',
              salary TEXT DEFAULT '',
              experience TEXT DEFAULT '',
              skills TEXT DEFAULT '',
              description TEXT DEFAULT '',
              created_at TEXT NOT NULL,
              FOREIGN KEY (recruiter_user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS shortlisted_candidates (
              recruiter_user_id INTEGER NOT NULL,
              candidate_user_id INTEGER NOT NULL,
              job_id INTEGER,
              shortlisted_at TEXT NOT NULL,
              PRIMARY KEY (recruiter_user_id, candidate_user_id, job_id),
              FOREIGN KEY (recruiter_user_id) REFERENCES users(id),
              FOREIGN KEY (candidate_user_id) REFERENCES users(id)
            );
            """
        )
        for column, definition in {
            "branch": "TEXT DEFAULT ''",
            "university": "TEXT DEFAULT ''",
            "roles": "TEXT DEFAULT ''",
            "certifications": "TEXT DEFAULT ''",
            "preferred_role": "TEXT DEFAULT ''",
            "salary_expectation": "TEXT DEFAULT ''",
        }.items():
            try:
                conn.execute(f"ALTER TABLE profiles ADD COLUMN {column} {definition}")
            except sqlite3.OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise
        _seed_jobs(conn)


def _seed_jobs(conn: sqlite3.Connection) -> None:
    now = datetime.utcnow().isoformat()
    existing = {
        (row["title"].strip().lower(), row["company"].strip().lower())
        for row in conn.execute("SELECT title, company FROM jobs")
    }
    rows = [(*job, now, now) for job in _default_job_catalog() if (job[0].strip().lower(), job[1].strip().lower()) not in existing]
    if rows:
        conn.executemany(
            """
            INSERT INTO jobs (title, company, skills, experience, salary, location, description, job_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )


def _default_job_catalog() -> list[tuple[str, str, str, str, str, str, str, str]]:
    """Seed a broad starter catalog while preserving admin-created jobs."""

    role_templates = [
        ("Data Analyst", "Python, SQL, Excel, Power BI, Data Visualization, Statistics", "Analyze datasets, build dashboards, clean data, and present business insights.", "4-8 LPA", "Fresher"),
        ("Business Analyst", "Excel, SQL, Requirements Gathering, Documentation, Communication, Agile", "Work with business teams, document requirements, analyze processes, and support delivery teams.", "5-10 LPA", "1-3 years"),
        ("Machine Learning Engineer", "Python, Machine Learning, Pandas, NumPy, Scikit-learn, SQL, Model Evaluation", "Build prediction models, prepare features, evaluate model quality, and support deployment pipelines.", "8-16 LPA", "1-3 years"),
        ("Data Scientist", "Python, Statistics, Machine Learning, SQL, Pandas, Data Storytelling, Experimentation", "Solve business problems using statistical analysis, machine learning, and clear data storytelling.", "10-22 LPA", "2-5 years"),
        ("Data Engineer", "SQL, Python, ETL, Spark, Airflow, Data Warehouse, Cloud", "Design data pipelines, transform large datasets, and maintain reliable warehouse tables.", "9-18 LPA", "2-5 years"),
        ("Frontend Developer", "React, JavaScript, TypeScript, HTML, CSS, REST API, Responsive Design", "Build responsive user interfaces, integrate APIs, and improve frontend performance.", "5-12 LPA", "1-3 years"),
        ("Backend Developer", "Python, Django, Flask, REST API, SQL, Git, Testing", "Create backend APIs, database models, authentication flows, and automated tests.", "6-14 LPA", "1-3 years"),
        ("Full Stack Developer", "React, Node.js, Python, SQL, REST API, Git, Deployment", "Develop complete web features across frontend, backend, database, and deployment layers.", "7-16 LPA", "1-4 years"),
        ("Java Developer", "Java, Spring Boot, SQL, REST API, Microservices, Git, Testing", "Build Java services, integrate databases, and maintain production APIs.", "6-14 LPA", "1-4 years"),
        ("Python Developer", "Python, Flask, Django, SQL, APIs, Automation, Git", "Develop Python applications, APIs, automations, and database-backed services.", "5-12 LPA", "1-3 years"),
        ("Node.js Developer", "Node.js, JavaScript, Express, MongoDB, SQL, REST API, Authentication", "Build server-side JavaScript APIs, authentication, and database integrations.", "6-14 LPA", "1-3 years"),
        ("Mobile App Developer", "Android, Java, Kotlin, React Native, APIs, Firebase, UI Design", "Build mobile screens, connect APIs, fix bugs, and release app updates.", "5-12 LPA", "1-3 years"),
        ("DevOps Engineer", "Linux, Docker, Kubernetes, CI/CD, AWS, Monitoring, Scripting", "Automate deployments, maintain cloud infrastructure, and improve release reliability.", "8-18 LPA", "2-5 years"),
        ("Cloud Engineer", "AWS, Azure, Linux, Networking, Terraform, Docker, Security", "Manage cloud resources, automate infrastructure, and support secure cloud deployments.", "8-18 LPA", "2-5 years"),
        ("Cyber Security Analyst", "Security, Networking, Linux, SIEM, Incident Response, Vulnerability Assessment", "Monitor threats, investigate incidents, and improve security controls.", "6-14 LPA", "1-4 years"),
        ("QA Automation Engineer", "Selenium, Python, Java, Testing, API Testing, Automation, SQL", "Write automated tests, verify releases, and improve regression test coverage.", "5-12 LPA", "1-3 years"),
        ("Manual Tester", "Manual Testing, Test Cases, Bug Reporting, API Testing, SQL, Communication", "Create test cases, execute functional tests, report bugs, and validate fixes.", "3-7 LPA", "Fresher"),
        ("UI UX Designer", "Figma, Wireframing, Prototyping, User Research, Visual Design, Communication", "Design clear product flows, prototypes, and user-friendly interface screens.", "5-12 LPA", "1-3 years"),
        ("Product Manager", "Product Strategy, User Research, Roadmap, Analytics, Communication, Agile", "Define product requirements, prioritize features, and work with design and engineering teams.", "10-24 LPA", "3-6 years"),
        ("Project Manager", "Project Planning, Agile, Communication, Risk Management, Reporting, Jira", "Plan delivery, coordinate teams, track risks, and communicate project status.", "8-18 LPA", "3-6 years"),
        ("Digital Marketing Executive", "Digital Marketing, SEO, Social Media, Content Marketing, Google Ads, Analytics", "Plan campaigns, write content, improve search reach, and measure marketing performance.", "3-7 LPA", "Fresher"),
        ("SEO Specialist", "SEO, Keyword Research, Google Analytics, Content Optimization, Search Console", "Improve organic traffic through keyword research, technical checks, and optimized content.", "4-9 LPA", "1-3 years"),
        ("Social Media Manager", "Social Media, Content Calendar, Copywriting, Analytics, Canva, Community Management", "Manage social channels, create posting plans, and track engagement metrics.", "4-9 LPA", "1-3 years"),
        ("Content Writer", "Content Writing, SEO, Research, Editing, Communication, Blogging", "Write articles, website content, product copy, and SEO-friendly content pieces.", "3-7 LPA", "Fresher"),
        ("Graphic Designer", "Graphic Design, Photoshop, Illustrator, Canva, Branding, Creativity", "Create visual assets, social posts, banners, and brand design material.", "3-8 LPA", "Fresher"),
        ("Sales Executive", "Sales, Communication, Negotiation, Lead Generation, CRM, Presentation", "Find leads, speak with customers, explain products, and close sales opportunities.", "3-8 LPA", "Fresher"),
        ("Business Development Executive", "Business Development, Sales, Lead Generation, Communication, CRM, Market Research", "Identify prospects, build client relationships, and support revenue growth.", "4-9 LPA", "1-3 years"),
        ("Customer Support Executive", "Customer Support, Communication, Email Writing, Troubleshooting, CRM, Patience", "Help customers, resolve tickets, document issues, and maintain service quality.", "3-6 LPA", "Fresher"),
        ("Technical Support Engineer", "Technical Support, Networking, Linux, Troubleshooting, Customer Support, Documentation", "Troubleshoot technical issues, guide users, and document support resolutions.", "4-9 LPA", "1-3 years"),
        ("HR Recruiter", "HR, Recruiting, Communication, Screening, Onboarding, Talent Acquisition", "Source candidates, screen resumes, schedule interviews, and support hiring operations.", "3-7 LPA", "Fresher"),
        ("HR Generalist", "HR, Employee Relations, Onboarding, Payroll, Communication, HR Policies", "Support employee lifecycle, HR documentation, onboarding, and policy coordination.", "4-9 LPA", "1-3 years"),
        ("Accounting Assistant", "Accounting, Excel, Tally, Bookkeeping, GST, Financial Reporting", "Maintain accounts, prepare reports, manage invoices, and support financial records.", "3-7 LPA", "Fresher"),
        ("Finance Analyst", "Finance, Excel, Financial Modeling, Accounting, Reporting, Data Analysis", "Analyze financial performance, prepare reports, and support budgeting decisions.", "5-12 LPA", "1-3 years"),
        ("Operations Executive", "Operations, Excel, Coordination, Reporting, Process Improvement, Communication", "Coordinate daily operations, maintain reports, and improve routine processes.", "3-8 LPA", "Fresher"),
        ("Office Administrator", "Administration, Excel, Communication, Scheduling, Documentation, Coordination", "Manage office tasks, schedules, records, communication, and daily coordination.", "3-6 LPA", "Fresher"),
        ("Teacher", "Teaching, Communication, Lesson Planning, Subject Knowledge, Assessment, Patience", "Plan lessons, teach students, prepare assessments, and support learning progress.", "3-8 LPA", "Fresher"),
        ("Data Entry Operator", "Data Entry, Excel, Typing, Accuracy, Documentation, Attention to Detail", "Enter, verify, and maintain data accurately across spreadsheets and systems.", "2-5 LPA", "Fresher"),
        ("Network Engineer", "Networking, Cisco, Routing, Switching, Firewall, Troubleshooting, Linux", "Configure networks, monitor connectivity, troubleshoot routing issues, and maintain secure infrastructure.", "5-12 LPA", "1-3 years"),
        ("System Administrator", "Linux, Windows Server, Networking, Scripting, Backup, Monitoring, Security", "Maintain servers, user access, backups, updates, and system reliability.", "5-11 LPA", "1-3 years"),
        ("Database Administrator", "SQL, Database Administration, Backup, Performance Tuning, MySQL, PostgreSQL", "Manage databases, tune queries, handle backups, and protect data availability.", "6-14 LPA", "2-5 years"),
        ("IT Support Specialist", "IT Support, Troubleshooting, Windows, Networking, Customer Support, Documentation", "Resolve hardware, software, and network issues while supporting end users.", "3-8 LPA", "Fresher"),
        ("Blockchain Developer", "Blockchain, Solidity, Web3, JavaScript, Smart Contracts, Security", "Build smart contracts, decentralized applications, and secure blockchain integrations.", "8-20 LPA", "1-4 years"),
        ("Game Developer", "Unity, C#, Game Design, JavaScript, 3D, Debugging, Performance", "Create gameplay systems, UI, mechanics, and performance improvements for games.", "5-14 LPA", "1-3 years"),
        ("AI Prompt Engineer", "AI, Prompt Engineering, NLP, Python, LLM, Evaluation, Communication", "Design prompts, evaluate AI outputs, build workflows, and improve model behavior.", "7-18 LPA", "1-3 years"),
        ("Robotics Engineer", "Robotics, Python, C++, Sensors, Control Systems, ROS, Automation", "Build robotic systems, integrate sensors, test controls, and automate workflows.", "7-16 LPA", "1-4 years"),
        ("Electrical Engineer", "Electrical Engineering, Circuit Design, AutoCAD, PLC, Testing, Safety", "Design electrical systems, inspect circuits, prepare documentation, and support field testing.", "4-10 LPA", "Fresher"),
        ("Mechanical Engineer", "Mechanical Engineering, AutoCAD, SolidWorks, Manufacturing, Quality, Maintenance", "Design parts, support production, troubleshoot equipment, and improve mechanical processes.", "4-10 LPA", "Fresher"),
        ("Civil Engineer", "Civil Engineering, AutoCAD, Site Supervision, Estimation, Project Planning, Safety", "Support construction planning, site checks, estimation, and quality documentation.", "4-10 LPA", "Fresher"),
        ("Legal Assistant", "Legal Research, Documentation, Communication, Compliance, MS Office, Drafting", "Prepare legal documents, research cases, maintain records, and support compliance tasks.", "3-8 LPA", "Fresher"),
        ("Medical Coder", "Medical Coding, ICD, CPT, Healthcare, Accuracy, Documentation", "Review clinical records, assign codes, and maintain accurate healthcare documentation.", "3-8 LPA", "Fresher"),
        ("Nursing Assistant", "Patient Care, Healthcare, Communication, Vital Signs, Safety, Empathy", "Support patient care, record basic observations, and assist clinical teams.", "2-6 LPA", "Fresher"),
        ("Supply Chain Analyst", "Supply Chain, Excel, Data Analysis, Inventory, Forecasting, Communication", "Analyze inventory, demand, vendor performance, and supply chain efficiency.", "5-11 LPA", "1-3 years"),
        ("Logistics Coordinator", "Logistics, Coordination, Excel, Vendor Management, Tracking, Communication", "Coordinate shipments, track deliveries, manage vendor updates, and prepare logistics reports.", "3-8 LPA", "Fresher"),
        ("Procurement Executive", "Procurement, Vendor Management, Negotiation, Excel, Purchase Orders, Communication", "Manage vendor quotes, purchase orders, negotiation, and procurement records.", "4-9 LPA", "1-3 years"),
        ("Retail Store Manager", "Retail, Sales, Inventory, Customer Service, Team Management, Reporting", "Manage store operations, sales targets, inventory, customer service, and team schedules.", "4-10 LPA", "1-3 years"),
        ("E-commerce Executive", "E-commerce, Excel, Product Listing, SEO, Customer Support, Analytics", "Manage product listings, marketplace operations, order tracking, and online sales reports.", "3-8 LPA", "Fresher"),
        ("Video Editor", "Video Editing, Premiere Pro, After Effects, Storytelling, YouTube, Creativity", "Edit videos, create motion graphics, improve storytelling, and prepare platform-ready content.", "3-9 LPA", "Fresher"),
        ("AI Engineer", "Python, AI, Machine Learning, Deep Learning, NLP, LLM, APIs, Cloud", "Build AI features, connect model services, test output quality, and support product teams with practical automation.", "12-28 LPA", "2-5 years"),
        ("Generative AI Engineer", "Python, Generative AI, LLM, Prompt Engineering, RAG, Vector Database, LangChain, APIs", "Create AI assistants, retrieval workflows, document search tools, and safe business automation for users.", "14-32 LPA", "2-5 years"),
        ("Big Data Specialist", "Big Data, Spark, Hadoop, Kafka, SQL, Python, Data Lake, Cloud", "Process large data streams, maintain data platforms, and help teams use reliable information at scale.", "10-24 LPA", "2-5 years"),
        ("FinTech Engineer", "Java, Python, APIs, Payments, Banking, Security, SQL, Microservices", "Build secure finance products for payments, lending, risk checks, customer onboarding, and account services.", "10-24 LPA", "2-5 years"),
        ("Information Security Analyst", "Cybersecurity, SIEM, Incident Response, Risk Assessment, Networking, Cloud Security, Compliance", "Monitor systems for threats, review security alerts, investigate incidents, and improve company protection.", "8-20 LPA", "1-4 years"),
        ("Cloud Security Engineer", "Cloud Security, AWS, Azure, IAM, Kubernetes, Terraform, Vulnerability Management, Compliance", "Secure cloud accounts, review access, protect workloads, and support audits across modern infrastructure.", "12-28 LPA", "2-5 years"),
        ("Renewable Energy Engineer", "Renewable Energy, Solar, Wind, Electrical Engineering, Project Planning, Grid Systems, Safety", "Design and support clean energy projects, review site needs, coordinate installation, and improve energy output.", "7-18 LPA", "1-4 years"),
        ("Solar Energy Technician", "Solar PV, Electrical Wiring, Installation, Maintenance, Safety, Site Inspection, Troubleshooting", "Install solar systems, inspect panels, maintain wiring, test performance, and resolve field issues.", "4-10 LPA", "Fresher"),
        ("Wind Turbine Service Technician", "Wind Turbine, Electrical Systems, Mechanical Maintenance, Safety, Troubleshooting, Field Service", "Inspect turbines, service mechanical parts, repair electrical systems, and keep wind assets operating safely.", "5-12 LPA", "1-3 years"),
        ("Electric Vehicle Systems Engineer", "Electric Vehicles, Battery Systems, Embedded Systems, Power Electronics, Testing, CAN, Safety", "Develop EV components, test battery and charging systems, document results, and support vehicle integration.", "8-20 LPA", "1-4 years"),
        ("Sustainability Analyst", "Sustainability, ESG, Data Analysis, Reporting, Carbon Accounting, Excel, Communication", "Track environmental metrics, prepare ESG reports, support carbon reduction plans, and coordinate sustainability programs.", "6-14 LPA", "1-3 years"),
        ("Nurse Practitioner", "Patient Care, Clinical Assessment, Diagnosis, Treatment Planning, Healthcare, Communication, EMR", "Assess patients, plan care, manage follow-ups, educate families, and coordinate with clinical teams.", "8-18 LPA", "3-6 years"),
        ("Medical and Health Services Manager", "Healthcare Management, Operations, Budgeting, Compliance, Staff Management, Patient Care, Reporting", "Manage healthcare teams, improve patient services, coordinate schedules, monitor budgets, and maintain compliance.", "10-24 LPA", "3-6 years"),
        ("Health Informatics Specialist", "Health Informatics, EMR, Data Analysis, SQL, Healthcare, Reporting, Privacy", "Improve clinical data systems, prepare health reports, support digital records, and protect patient information.", "7-16 LPA", "1-4 years"),
        ("Mental Health Counselor", "Counseling, Psychology, Patient Support, Assessment, Communication, Care Planning, Documentation", "Support clients through counseling sessions, prepare care plans, maintain records, and coordinate referrals.", "4-12 LPA", "1-4 years"),
        ("Logistics Analyst", "Logistics, Supply Chain, Excel, SQL, Forecasting, Inventory, Vendor Management", "Analyze shipments, inventory, and delivery performance to improve cost, speed, and service reliability.", "5-12 LPA", "1-3 years"),
        ("Robotics Automation Specialist", "Robotics, Automation, PLC, Python, Sensors, Maintenance, Industrial Systems", "Set up automated equipment, monitor production systems, troubleshoot sensors, and improve factory workflows.", "7-18 LPA", "1-4 years"),
        ("Product Data Analyst", "SQL, Product Analytics, Python, A/B Testing, Dashboards, Metrics, Communication", "Study product usage, build dashboards, measure feature performance, and share insights with product teams.", "8-18 LPA", "1-4 years"),
        ("AI Product Manager", "Product Management, AI, Roadmap, User Research, Analytics, Communication, Agile", "Plan AI product features, define user needs, coordinate engineering work, and track product outcomes.", "14-30 LPA", "3-6 years"),
        ("Cybersecurity Consultant", "Cybersecurity, Risk Assessment, Compliance, Cloud Security, Communication, Audit, Incident Response", "Advise clients on security risks, prepare improvement plans, review controls, and guide safer operations.", "10-24 LPA", "2-5 years"),
        ("AI ML Developer", "Python, Machine Learning, Deep Learning, TensorFlow, PyTorch, APIs, SQL, Git", "Develop machine learning features, train models, connect APIs, and turn AI course projects into production-ready tools.", "10-24 LPA", "1-4 years"),
        ("Junior AI ML Engineer", "Python, Machine Learning, Pandas, NumPy, Scikit-learn, Model Evaluation, SQL", "Support model training, clean datasets, run experiments, document results, and help senior engineers ship AI features.", "6-14 LPA", "Fresher"),
        ("Data Science Associate", "Python, Statistics, Machine Learning, SQL, Pandas, Visualization, Business Communication", "Analyze business problems, build notebooks, create predictive models, and explain insights to non-technical teams.", "6-15 LPA", "Fresher"),
        ("Junior Data Scientist", "Python, Statistics, Machine Learning, SQL, Tableau, Power BI, Data Cleaning", "Prepare data, test models, build visual reports, and support data science projects across business teams.", "7-16 LPA", "Fresher"),
        ("Data Analytics Associate", "Excel, SQL, Power BI, Tableau, Data Cleaning, Reporting, Communication", "Create reports, clean spreadsheets, build dashboards, and summarize trends for managers and clients.", "4-10 LPA", "Fresher"),
        ("Business Intelligence Analyst", "Power BI, Tableau, SQL, Excel, Data Modeling, KPIs, Dashboard Design", "Build BI dashboards, define KPIs, automate reports, and help teams make better decisions from data.", "6-16 LPA", "1-4 years"),
        ("Power BI Developer", "Power BI, DAX, Power Query, SQL, Data Modeling, Excel, Dashboard Design", "Create interactive Power BI dashboards, transform data, write DAX measures, and publish reports for business users.", "6-15 LPA", "1-3 years"),
        ("Tableau Developer", "Tableau, SQL, Data Visualization, Dashboard Design, Excel, Data Analysis, Storytelling", "Design Tableau dashboards, connect data sources, prepare extracts, and present clear visual insights.", "6-15 LPA", "1-3 years"),
        ("SQL Data Analyst", "SQL, Excel, Data Cleaning, Reporting, Joins, Window Functions, Dashboarding", "Write SQL queries, validate data, prepare reports, and answer business questions using structured datasets.", "5-12 LPA", "Fresher"),
        ("Python Data Analyst", "Python, Pandas, NumPy, SQL, Excel, Data Visualization, Statistics", "Use Python to clean data, automate reports, create charts, and prepare analysis for business teams.", "5-13 LPA", "Fresher"),
        ("Analytics Engineer", "SQL, dbt, Data Warehouse, Data Modeling, Python, BI, Data Quality", "Build trusted analytics tables, maintain transformation pipelines, and connect warehouse data to dashboards.", "10-24 LPA", "2-5 years"),
        ("Cloud Data Engineer", "AWS, Azure, GCP, Python, SQL, Spark, Airflow, Data Warehouse", "Build cloud data pipelines, manage storage, schedule ETL jobs, and support analytics platforms.", "10-24 LPA", "2-5 years"),
        ("MLOps Engineer", "Python, MLOps, Docker, Kubernetes, MLflow, CI/CD, Cloud, Model Monitoring", "Deploy ML models, monitor model performance, automate retraining, and keep AI systems reliable.", "12-28 LPA", "2-5 years"),
        ("LLMOps Engineer", "LLM, Python, RAG, Vector Database, Model Monitoring, APIs, Cloud, Evaluation", "Deploy and monitor LLM applications, improve retrieval quality, track model behavior, and support AI products.", "14-32 LPA", "2-5 years"),
        ("NLP Engineer", "Python, NLP, Transformers, LLM, Text Classification, PyTorch, Hugging Face, APIs", "Build text analysis, chatbot, search, and document understanding features using modern language models.", "12-28 LPA", "1-4 years"),
        ("Computer Vision Engineer", "Python, OpenCV, PyTorch, TensorFlow, Image Processing, Object Detection, Deep Learning", "Create image recognition systems, train computer vision models, test accuracy, and support camera-based products.", "12-28 LPA", "1-4 years"),
        ("AI Trainer", "AI, Prompt Engineering, Data Labeling, Quality Review, Communication, Evaluation, Domain Knowledge", "Review AI outputs, improve prompts, label examples, and help teams train safer and more useful AI systems.", "5-12 LPA", "Fresher"),
        ("Data Quality Analyst", "SQL, Data Quality, Excel, Validation, Documentation, Data Governance, Reporting", "Check data accuracy, find gaps, document rules, and work with data teams to improve trusted datasets.", "5-12 LPA", "Fresher"),
        ("Data Governance Analyst", "Data Governance, Compliance, Data Catalog, SQL, Privacy, Documentation, Communication", "Maintain data standards, document ownership, support privacy rules, and improve how teams manage business data.", "8-18 LPA", "2-5 years"),
        ("Data Visualization Specialist", "Power BI, Tableau, Excel, Figma, Storytelling, SQL, Dashboard Design", "Turn complex data into clean visual dashboards, executive reports, and easy-to-understand business stories.", "6-16 LPA", "1-4 years"),
        ("Marketing Data Analyst", "Marketing Analytics, SQL, Excel, Google Analytics, Power BI, Campaign Analysis, Reporting", "Measure campaigns, analyze customer behavior, build marketing dashboards, and recommend growth improvements.", "6-15 LPA", "1-3 years"),
        ("Financial Data Analyst", "Finance, SQL, Excel, Python, Power BI, Forecasting, Financial Modeling", "Analyze financial performance, automate finance reports, prepare forecasts, and support planning decisions.", "7-18 LPA", "1-4 years"),
        ("Healthcare Data Analyst", "Healthcare, SQL, Excel, Power BI, Data Analysis, Reporting, Privacy", "Analyze patient, operations, and service data while supporting healthcare reporting and privacy expectations.", "6-15 LPA", "1-4 years"),
        ("HR Data Analyst", "HR Analytics, Excel, SQL, Power BI, Reporting, Workforce Planning, Communication", "Analyze hiring, retention, attendance, and workforce data to support HR planning and people decisions.", "5-12 LPA", "1-3 years"),
        ("Operations Research Analyst", "Operations Research, Python, SQL, Optimization, Statistics, Forecasting, Simulation", "Use data models to improve scheduling, inventory, routing, staffing, and business operations.", "8-20 LPA", "1-4 years"),
        ("Risk Data Analyst", "Risk Analytics, SQL, Python, Excel, Statistics, Finance, Reporting", "Analyze fraud, credit, operational, or compliance risk data and prepare reports for decision makers.", "7-18 LPA", "1-4 years"),
        ("Customer Insights Analyst", "Customer Analytics, SQL, Excel, Survey Analysis, Power BI, Segmentation, Storytelling", "Study customer behavior, segment audiences, analyze feedback, and present insights that improve products.", "6-15 LPA", "1-3 years"),
    ]
    companies = [
        "InsightWorks", "AIMind Labs", "PixelCraft", "GrowthNest", "PeopleFirst", "CloudBridge", "FinEdge",
        "SkillForge", "MarketPulse", "DataVista", "BrightPath", "TechNova", "SupportHub", "EduSpark",
        "RetailCore", "HealthSync", "GreenLeaf", "UrbanStack", "NextWave Systems", "BluePeak Analytics",
        "NovaHire", "TalentBridge", "CodeCraft Labs", "AdVantage Media", "CareConnect", "LedgerWise",
        "OpsMatrix", "LearnSphere", "SecureNet", "AppWorks", "CloudNest", "DesignLoop",
    ]
    locations = [
        "Bangalore", "Hyderabad", "Chennai", "Pune", "Mumbai", "Delhi", "Noida", "Gurgaon", "Remote",
        "Kolkata", "Ahmedabad", "Coimbatore", "Jaipur", "Indore", "Kochi", "Trivandrum", "Mysore",
        "Remote within India", "Hybrid - Bangalore", "Hybrid - Pune", "Hybrid - Hyderabad",
    ]
    job_types = ["Full-time", "Full-time", "Full-time", "Hybrid", "Remote"]
    variants = [
        ("", None, None), ("Associate", "Fresher", None), ("Specialist", None, None),
        ("Junior", "Fresher", None), ("Senior", "3-6 years", None), ("Lead", "5+ years", None),
        ("Trainee", "Fresher", "Internship"), ("Consultant", "2-5 years", None), ("Executive", "Fresher", None),
        ("Coordinator", "1-3 years", None), ("Analyst", "1-3 years", None), ("Manager", "5+ years", None),
        ("Remote", None, "Remote"), ("Hybrid", None, "Hybrid"), ("Intern", "Internship", "Internship"),
        ("Entry Level", "Fresher", None), ("Professional", "2-5 years", None), ("Principal", "6+ years", None),
        ("Healthcare", "1-3 years", None), ("FinTech", "1-3 years", None), ("EdTech", "1-3 years", None),
        ("Retail", "1-3 years", None), ("Banking", "2-5 years", None), ("SaaS", "2-5 years", None),
        ("E-commerce", "1-3 years", None), ("Manufacturing", "2-5 years", None), ("Logistics", "1-3 years", None),
        ("Telecom", "2-5 years", None), ("Insurance", "1-3 years", None), ("Real Estate", "1-3 years", None),
        ("Media", "1-3 years", None), ("Education", "Fresher", None), ("Automotive", "2-5 years", None),
        ("Energy", "2-5 years", None), ("Travel", "1-3 years", None), ("Hospitality", "1-3 years", None),
        ("Remote India", None, "Remote"), ("Hybrid Bangalore", None, "Hybrid"), ("Hybrid Hyderabad", None, "Hybrid"),
        ("Hybrid Pune", None, "Hybrid"), ("Night Shift", "1-3 years", None), ("Part Time", "Fresher", "Part-time"),
        ("Contract", "2-5 years", "Contract"), ("Graduate", "Fresher", None), ("Campus", "Fresher", None),
        ("Lateral", "2-5 years", None), ("Experienced", "3-6 years", None), ("Staff", "5+ years", None),
        ("Regional", "2-5 years", None), ("Global", "3-6 years", None), ("Client Facing", "1-3 years", None),
        ("Operations", "1-3 years", None), ("Implementation", "2-5 years", None), ("Platform", "2-5 years", None),
        ("Product", "2-5 years", None), ("Growth", "1-3 years", None), ("Performance", "2-5 years", None),
        ("Quality", "1-3 years", None), ("Compliance", "2-5 years", None), ("Research", "2-5 years", None),
        ("Training", "1-3 years", None), ("Support", "Fresher", None), ("Customer Success", "1-3 years", None),
        ("Enterprise", "3-6 years", None), ("SMB", "1-3 years", None), ("B2B", "1-3 years", None),
        ("B2C", "1-3 years", None), ("Automation", "2-5 years", None), ("Analytics", "1-3 years", None),
        ("Strategy", "3-6 years", None), ("Delivery", "2-5 years", None),
    ]
    catalog: list[tuple[str, str, str, str, str, str, str, str]] = []
    for index, (title, skills, description, salary, experience) in enumerate(role_templates):
        for variant, (suffix, variant_experience, variant_type) in enumerate(variants):
            company = companies[(index + variant * 5) % len(companies)]
            location = locations[(index * 2 + variant * 3) % len(locations)]
            job_type = variant_type or job_types[(index + variant) % len(job_types)]
            final_experience = variant_experience or experience
            role_title = title if not suffix else f"{suffix} {title}"
            if suffix in {"Remote", "Hybrid"}:
                role_title = f"{title} - {suffix}"
            detail = (
                f"{description} Work with cross-functional teams, maintain clear documentation, "
                f"track outcomes, and use {skills.split(',')[0].strip()} plus related tools in day-to-day work. "
                f"This role is suitable for {final_experience} candidates and requires practical knowledge of {skills}."
            )
            catalog.append((role_title, company, skills, final_experience, salary, location, detail, job_type))
    return catalog


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
            """
            SELECT skills, education, branch, university, experience, roles, certifications,
                   preferred_role, location, salary_expectation, resume_text
            FROM profiles WHERE user_id = ?
            """,
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
            """
            SELECT skills, education, branch, university, experience, roles, certifications,
                   preferred_role, location, salary_expectation, resume_text
            FROM profiles WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()
        current_data = dict(current) if current else {}
        merged = {
            "skills": profile.get("skills", current_data.get("skills", "")),
            "education": profile.get("education", current_data.get("education", "")),
            "branch": profile.get("branch", current_data.get("branch", "")),
            "university": profile.get("university", current_data.get("university", "")),
            "experience": profile.get("experience", current_data.get("experience", "")),
            "roles": profile.get("roles", current_data.get("roles", "")),
            "certifications": profile.get("certifications", current_data.get("certifications", "")),
            "preferred_role": profile.get("preferred_role", current_data.get("preferred_role", "")),
            "location": profile.get("location", current_data.get("location", "")),
            "salary_expectation": profile.get("salary_expectation", current_data.get("salary_expectation", "")),
            "resume_text": profile.get("resume_text", current_data.get("resume_text", "")),
        }
        conn.execute(
            """
            INSERT INTO profiles (
              user_id, skills, education, branch, university, experience, roles,
              certifications, preferred_role, location, salary_expectation, resume_text, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              skills = excluded.skills,
              education = excluded.education,
              branch = excluded.branch,
              university = excluded.university,
              experience = excluded.experience,
              roles = excluded.roles,
              certifications = excluded.certifications,
              preferred_role = excluded.preferred_role,
              location = excluded.location,
              salary_expectation = excluded.salary_expectation,
              resume_text = excluded.resume_text,
              updated_at = excluded.updated_at
            """,
            (
                user_id,
                merged["skills"],
                merged["education"],
                merged["branch"],
                merged["university"],
                merged["experience"],
                merged["roles"],
                merged["certifications"],
                merged["preferred_role"],
                merged["location"],
                merged["salary_expectation"],
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


def list_jobs(limit: int = 500, offset: int = 0) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, title, company, skills, experience, salary, location, description, job_type, created_at, updated_at
            FROM jobs ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [dict(row) for row in rows]


def get_job(job_id: int) -> dict:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        raise ValueError("Job not found.")
    return dict(row)


def create_job(payload: dict) -> dict:
    title = str(payload.get("title", "")).strip()
    company = str(payload.get("company", "")).strip()
    skills = str(payload.get("skills", "")).strip()
    if not title or not company or not skills:
        raise ValueError("Title, company, and skills are required.")
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO jobs (title, company, skills, experience, salary, location, description, job_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                title,
                company,
                skills,
                str(payload.get("experience", "")).strip(),
                str(payload.get("salary", "")).strip(),
                str(payload.get("location", "")).strip(),
                str(payload.get("description", "")).strip(),
                str(payload.get("job_type") or payload.get("type") or "Full-time").strip(),
                now,
                now,
            ),
        )
    return get_job(int(cursor.lastrowid))


def update_job(job_id: int, payload: dict) -> dict:
    current = get_job(job_id)
    merged = {key: str(payload.get(key, current.get(key, ""))).strip() for key in ("title", "company", "skills", "experience", "salary", "location", "description", "job_type")}
    if not merged["title"] or not merged["company"] or not merged["skills"]:
        raise ValueError("Title, company, and skills are required.")
    with get_db() as conn:
        conn.execute(
            """
            UPDATE jobs
            SET title = ?, company = ?, skills = ?, experience = ?, salary = ?, location = ?, description = ?, job_type = ?, updated_at = ?
            WHERE id = ?
            """,
            (merged["title"], merged["company"], merged["skills"], merged["experience"], merged["salary"], merged["location"], merged["description"], merged["job_type"], datetime.utcnow().isoformat(), job_id),
        )
    return get_job(job_id)


def delete_job(job_id: int) -> None:
    with get_db() as conn:
        conn.execute("DELETE FROM saved_jobs WHERE job_id = ?", (job_id,))
        conn.execute("DELETE FROM applied_jobs WHERE job_id = ?", (job_id,))
        cursor = conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
        if cursor.rowcount == 0:
            raise ValueError("Job not found.")


def collaborative_job_ids(user_id: int, limit: int = 20) -> list[int]:
    """Return jobs liked/applied by users with similar saved/applied behavior."""
    with get_db() as conn:
        own_rows = conn.execute(
            """
            SELECT job_id FROM saved_jobs WHERE user_id = ?
            UNION
            SELECT job_id FROM applied_jobs WHERE user_id = ?
            """,
            (user_id, user_id),
        ).fetchall()
        own_ids = {int(row["job_id"]) for row in own_rows}
        if not own_ids:
            return []
        placeholders = ",".join("?" for _ in own_ids)
        rows = conn.execute(
            f"""
            WITH interactions AS (
              SELECT user_id, job_id FROM saved_jobs
              UNION ALL
              SELECT user_id, job_id FROM applied_jobs
            ),
            similar_users AS (
              SELECT user_id, COUNT(*) AS overlap
              FROM interactions
              WHERE job_id IN ({placeholders}) AND user_id != ?
              GROUP BY user_id
            )
            SELECT interactions.job_id, SUM(similar_users.overlap) AS score
            FROM interactions
            JOIN similar_users ON interactions.user_id = similar_users.user_id
            GROUP BY interactions.job_id
            ORDER BY score DESC
            LIMIT ?
            """,
            (*own_ids, user_id, limit),
        ).fetchall()
    return [int(row["job_id"]) for row in rows if int(row["job_id"]) not in own_ids]


def create_recruiter_job(recruiter_user_id: int | None, payload: dict) -> dict:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO recruiter_jobs (
              recruiter_user_id, title, company, location, salary, experience, skills, description, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                recruiter_user_id,
                str(payload.get("title", "")).strip(),
                str(payload.get("company", "")).strip() or "Company not listed",
                str(payload.get("location", "")).strip(),
                str(payload.get("salary", "")).strip(),
                str(payload.get("experience", "")).strip(),
                str(payload.get("skills", "")).strip(),
                str(payload.get("description", "")).strip(),
                now,
            ),
        )
        job_id = int(cursor.lastrowid)
    return get_recruiter_job(job_id)


def get_recruiter_job(job_id: int) -> dict:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM recruiter_jobs WHERE id = ?", (job_id,)).fetchone()
    if not row:
        raise ValueError("Recruiter job not found.")
    return dict(row)


def list_recruiter_jobs(recruiter_user_id: int | None = None) -> list[dict]:
    with get_db() as conn:
        if recruiter_user_id:
            rows = conn.execute(
                "SELECT * FROM recruiter_jobs WHERE recruiter_user_id = ? ORDER BY created_at DESC",
                (recruiter_user_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM recruiter_jobs ORDER BY created_at DESC LIMIT 50").fetchall()
    return [dict(row) for row in rows]


def search_candidates(query: str = "", limit: int = 20) -> list[dict]:
    terms = [term for term in query.lower().replace(",", " ").split() if len(term) > 1]
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT users.id, users.name, users.email, profiles.skills, profiles.education,
                   profiles.experience, profiles.location, profiles.preferred_role,
                   profiles.certifications
            FROM users
            JOIN profiles ON profiles.user_id = users.id
            WHERE TRIM(profiles.skills) != ''
            ORDER BY profiles.updated_at DESC
            LIMIT 200
            """
        ).fetchall()
    candidates = []
    for row in rows:
        data = dict(row)
        haystack = " ".join(str(data.get(key, "")) for key in ("skills", "preferred_role", "certifications", "education")).lower()
        score = sum(1 for term in terms if term in haystack)
        if terms and score == 0:
            continue
        data["resume_rank"] = min(99, 45 + score * 12 + min(len(str(data.get("skills", "")).split(",")), 5) * 3)
        candidates.append(data)
    candidates.sort(key=lambda item: item["resume_rank"], reverse=True)
    return candidates[:limit]


def shortlist_candidate(recruiter_user_id: int, candidate_user_id: int, job_id: int | None = None) -> list[dict]:
    with get_db() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO shortlisted_candidates (recruiter_user_id, candidate_user_id, job_id, shortlisted_at)
            VALUES (?, ?, ?, ?)
            """,
            (recruiter_user_id, candidate_user_id, job_id, datetime.utcnow().isoformat()),
        )
    return list_shortlisted_candidates(recruiter_user_id)


def list_shortlisted_candidates(recruiter_user_id: int) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT users.id, users.name, users.email, profiles.skills, profiles.preferred_role,
                   profiles.location, shortlisted_candidates.job_id, shortlisted_candidates.shortlisted_at
            FROM shortlisted_candidates
            JOIN users ON users.id = shortlisted_candidates.candidate_user_id
            LEFT JOIN profiles ON profiles.user_id = users.id
            WHERE shortlisted_candidates.recruiter_user_id = ?
            ORDER BY shortlisted_candidates.shortlisted_at DESC
            """,
            (recruiter_user_id,),
        ).fetchall()
    return [dict(row) for row in rows]
