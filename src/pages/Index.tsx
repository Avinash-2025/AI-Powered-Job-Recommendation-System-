import { useEffect, useMemo, useState } from "react";
import { Database, Filter, LogOut, Search } from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import CareerChatbot from "@/components/CareerChatbot";
import DashboardAnalytics from "@/components/DashboardAnalytics";
import JobListings from "@/components/JobListings";
import ProfileForm from "@/components/ProfileForm";
import RecommendationCard from "@/components/RecommendationCard";
import ResumeAnalyzer from "@/components/ResumeAnalyzer";
import RoadmapPanel from "@/components/RoadmapPanel";
import SkillGapPanel from "@/components/SkillGapPanel";
import TrackedJobs from "@/components/TrackedJobs";
import { apiGet, apiPost, apiPut, JobRecommendation, Profile, RecommendationResponse, RoadmapStep, SkillGap, User } from "@/lib/api";

const emptyProfile: Profile = {
  skills: "python sql machine learning",
  education: "Bachelor",
  experience: "1-3 years",
  location: "Remote",
};

const Index = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("job-ai-token"));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobRecommendation[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<JobRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState({ location: "", minMatch: 0 });

  useEffect(() => {
    if (!token) return;
    apiGet<{ user: User; saved_job_ids: number[]; applied_job_ids: number[] }>("/profile", token)
      .then((response) => {
        setUser(response.user);
        setProfile({ ...emptyProfile, ...response.user.profile });
        setSavedJobIds(response.saved_job_ids);
        setAppliedJobIds(response.applied_job_ids || []);
        loadTrackedJobs(token);
      })
      .catch(() => {
        localStorage.removeItem("job-ai-token");
        setToken(null);
      });
  }, [token]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter.location && !job.location.toLowerCase().includes(filter.location.toLowerCase()) && job.type.toLowerCase() !== filter.location.toLowerCase()) {
        return false;
      }
      if (job.match < filter.minMatch) {
        return false;
      }
      return true;
    });
  }, [jobs, filter]);

  const handleAuth = (nextToken: string, nextUser: User) => {
    localStorage.setItem("job-ai-token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setProfile({ ...emptyProfile, ...nextUser.profile });
  };

  const saveProfile = async () => {
    if (!token) {
      setStatus("Login to save your profile.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiPut<{ user: User }>("/profile", profile, token);
      setUser(response.user);
      setStatus("Profile saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const recommend = async () => {
    setLoading(true);
    setStatus("");
    try {
      const response = await apiPost<RecommendationResponse>("/recommend", { ...profile, top_n: 5 }, token);
      setJobs(response.jobs);
      setGap(response.skill_gap);
      setRoadmap(response.roadmap || []);
      setStatus(`Found ${response.total} ML-ranked jobs.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Recommendation failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (jobId: number) => {
    if (!token) {
      setStatus("Login to save jobs.");
      return;
    }
    const saved = savedJobIds.includes(jobId);
    const response = await fetch(`/api/saved-jobs/${jobId}`, {
      method: saved ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setSavedJobIds(data.saved_job_ids || []);
    loadTrackedJobs(token);
  };

  const applyJob = async (jobId: number) => {
    if (!token) {
      setStatus("Login to apply for jobs.");
      return;
    }
    const response = await fetch(`/api/applied-jobs/${jobId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setAppliedJobIds(data.applied_job_ids || []);
    loadTrackedJobs(token);
  };

  const loadTrackedJobs = async (activeToken: string) => {
    const [saved, applied] = await Promise.all([
      apiGet<{ job_ids: number[]; jobs: JobRecommendation[] }>("/saved-jobs", activeToken),
      apiGet<{ job_ids: number[]; jobs: JobRecommendation[] }>("/applied-jobs", activeToken),
    ]);
    setSavedJobs(saved.jobs);
    setAppliedJobs(applied.jobs);
    setSavedJobIds(saved.job_ids);
    setAppliedJobIds(applied.job_ids);
  };

  const logout = () => {
    localStorage.removeItem("job-ai-token");
    setToken(null);
    setUser(null);
    setSavedJobIds([]);
    setAppliedJobIds([]);
    setSavedJobs([]);
    setAppliedJobs([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {!user && <AuthPanel onAuth={handleAuth} />}

      <main className="container py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="h-4 w-4 text-primary" />
            Flask + SQLite + TF-IDF cosine similarity + resume NLP
          </div>
          <div className="flex items-center gap-3">
            {user && <span className="text-sm font-medium">Signed in as {user.name}</span>}
            {user && (
              <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <ProfileForm profile={profile} loading={loading} onChange={setProfile} onSave={saveProfile} onRecommend={recommend} />

            <DashboardAnalytics jobs={jobs} gap={gap} savedCount={savedJobIds.length} appliedCount={appliedJobIds.length} />

            <ResumeAnalyzer
              token={token}
              experience={profile.experience}
              education={profile.education}
              location={profile.location}
              onAnalysis={(nextJobs, nextGap, skills, nextRoadmap) => {
                setJobs(nextJobs);
                setGap(nextGap);
                setRoadmap(nextRoadmap);
                setProfile((current) => ({ ...current, skills: skills.join(" ") || current.skills }));
                setStatus("Resume analyzed and recommendations refreshed.");
              }}
            />

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Recommended Jobs</h2>
                  <p className="text-sm text-muted-foreground">Top 5 results from TF-IDF vectorization and cosine similarity.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Filter className="h-4 w-4" />
                    <input
                      className="w-28 outline-none"
                      placeholder="Location"
                      value={filter.location}
                      onChange={(event) => setFilter((current) => ({ ...current, location: event.target.value }))}
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Search className="h-4 w-4" />
                    <input
                      type="number"
                      min="0"
                      max="99"
                      className="w-20 outline-none"
                      placeholder="Min %"
                      value={filter.minMatch || ""}
                      onChange={(event) => setFilter((current) => ({ ...current, minMatch: Number(event.target.value) || 0 }))}
                    />
                  </label>
                </div>
              </div>

              {status && <div className="mb-4 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">{status}</div>}

              <div className="grid gap-4">
                {filteredJobs.length ? (
                  filteredJobs.map((job) => (
                    <RecommendationCard
                      key={job.id}
                      job={job}
                      saved={savedJobIds.includes(job.id)}
                      applied={appliedJobIds.includes(job.id)}
                      onToggleSave={toggleSave}
                      onApply={applyJob}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
                    Enter skills and run recommendations to see job cards.
                  </div>
                )}
              </div>
            </section>

            <JobListings savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />

            <TrackedJobs savedJobs={savedJobs} appliedJobs={appliedJobs} />
          </div>

          <div className="space-y-5">
            <SkillGapPanel gap={gap} totalJobs={jobs.length} />
            <RoadmapPanel roadmap={roadmap} />
          </div>
        </div>
      </main>

      <CareerChatbot token={token} />
    </div>
  );
};

export default Index;
