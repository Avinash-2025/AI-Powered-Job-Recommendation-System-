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
  match?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  source?: string;
}

export interface Profile {
  skills: string;
  education: string;
  experience: string;
  location: string;
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

export interface ChatResponse {
  reply: string;
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost<T>(path: string, body: unknown, token: string | null = null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function apiPut<T>(path: string, body: unknown, token: string | null = null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string, token: string | null = null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(token),
  });
  return parseResponse<T>(response);
}

export async function uploadResume(formData: FormData, token: string | null) {
  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  return parseResponse<{
    resume: { text: string; skills: string[]; word_count: number };
    recommendations: JobRecommendation[];
    skill_gap: SkillGap;
    roadmap: RoadmapStep[];
  }>(response);
}
