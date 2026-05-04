export interface JobRecommendation {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
  education: string;
  skills: string;
  description: string;
  apply_url?: string;
  match?: number;
  final_score?: number;
  tfidf_score?: number;
  knn_score?: number;
  skill_score?: number;
  preference_score?: number;
  preference_matches?: Record<string, number>;
  content_score?: number;
  collaborative_score?: number;
  popularity?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  source?: string;
}

export interface Profile {
  skills: string;
  education: string;
  branch?: string;
  university?: string;
  experience: string;
  roles?: string;
  certifications?: string;
  preferred_role?: string;
  location: string;
  salary_expectation?: string;
  resume_text?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  profile: Profile;
}

export interface SkillGap {
  matched: string[];
  missing: string[];
}

export interface RoadmapStep {
  phase: string;
  title: string;
  duration: string;
  items: string[];
  outcome: string;
}

export interface RecommendationResponse {
  jobs: JobRecommendation[];
  total: number;
  skill_gap: SkillGap;
  roadmap: RoadmapStep[];
  query: Profile;
}

export interface JobAlert {
  id: number;
  title: string;
  company: string;
  match: number;
  message: string;
}

export interface InterviewPrepResponse {
  role: string;
  questions: string[];
  tips: string[];
}

export interface RecruiterJob {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  skills: string;
  description: string;
  created_at?: string;
}

export interface Candidate {
  id: number;
  name: string;
  email: string;
  skills: string;
  education?: string;
  experience?: string;
  location?: string;
  preferred_role?: string;
  certifications?: string;
  resume_rank?: number;
  job_id?: number;
}

export interface ChatResponse {
  reply: string;
  provider?: "gemini" | "local";
  jobs: JobRecommendation[];
  suggested_skills: string[];
  suggested_courses?: string[];
  detected_skills: string[];
  roadmap?: RoadmapStep[];
}

export interface JobListingsResponse {
  jobs: JobRecommendation[];
  total: number;
  limit: number;
  offset: number;
}

const API_BASE = "/api";

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let data: { error?: string } = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    throw new Error(data.error || raw || `Request failed (${response.status})`);
  }
  return data as T;
}

export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost<T>(path: string, body: unknown, token: string | null = null, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
    signal,
  });
  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body: unknown, token: string | null = null, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
    signal,
  });
  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string, token: string | null = null, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(token),
    signal,
  });
  return parseResponse<T>(response);
}

export async function uploadResume(formData: FormData, token: string | null, signal?: AbortSignal) {
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
    signal,
  });
  return parseResponse<{
    resume: { text: string; skills: string[]; word_count: number };
    recommendations: JobRecommendation[];
    skill_gap: SkillGap;
    roadmap: RoadmapStep[];
  }>(response);
}
