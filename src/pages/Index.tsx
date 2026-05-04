import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FileText,
  LogOut,
  MapPin,
  Menu,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import AuthPanel from "@/components/AuthPanel";
import CareerChatbot from "@/components/CareerChatbot";
import InterviewPrepPanel from "@/components/InterviewPrepPanel";
import ProfileForm from "@/components/ProfileForm";
import RecommendationCard from "@/components/RecommendationCard";
import ResumeAnalyzer from "@/components/ResumeAnalyzer";
import RoadmapTimeline from "@/components/RoadmapTimeline";
import SkillGapPanel from "@/components/SkillGapPanel";
import {
  apiGet,
  apiPost,
  apiPut,
  JobAlert,
  JobListingsResponse,
  JobRecommendation,
  Profile,
  RecommendationResponse,
  RoadmapStep,
  SkillGap,
  User as AppUser,
} from "@/lib/api";
import { popularSkillSuggestions, skillSuggestionOptions } from "@/lib/skills";

type View = "dashboard" | "profile" | "resume" | "jobs" | "applications" | "roadmap";
type RecommendMode = "profile" | "manual";

const emptyProfile: Profile = {
  skills: "",
  education: "",
  branch: "",
  university: "",
  experience: "",
  roles: "",
  certifications: "",
  preferred_role: "",
  location: "",
  salary_expectation: "",
};

const navItems: Array<{ label: string; view: View; icon: typeof Briefcase }> = [
  { label: "Dashboard", view: "dashboard", icon: Briefcase },
  { label: "Resume Upload", view: "resume", icon: FileText },
  { label: "Jobs", view: "jobs", icon: Search },
  { label: "Applications", view: "applications", icon: ClipboardList },
  { label: "Roadmap", view: "roadmap", icon: Target },
];

const viewTitles: Record<View, string> = {
  dashboard: "Dashboard",
  profile: "Profile",
  resume: "Resume Upload",
  jobs: "Jobs",
  applications: "Applications",
  roadmap: "Roadmap",
};

const splitSkills = (value: string) =>
  value
    .split(/[,;\n]+/)
    .map((skill) => skill.trim())
    .filter(isManualSkillTag);

const isManualSkillTag = (skill: string) => {
  const clean = skill.trim();
  if (!clean) return false;
  if (clean.length > 36) return false;
  if (clean.split(/\s+/).length > 4) return false;
  return /[a-z]/i.test(clean);
};

const normalizeManualProfile = (profile: Profile): Profile => ({
  ...profile,
  preferred_role: "",
  skills: splitSkills(profile.skills || "").join(", "),
});

const popularSuggestions = popularSkillSuggestions;

const searchSuggestionOptions = [
  "AI Engineer",
  "AI ML Developer",
  "Junior AI ML Engineer",
  "Machine Learning Engineer",
  "MLOps Engineer",
  "LLMOps Engineer",
  "NLP Engineer",
  "Computer Vision Engineer",
  "AI Trainer",
  "Data Scientist",
  "Junior Data Scientist",
  "Data Science Associate",
  "Data Analyst",
  "Data Analytics Associate",
  "SQL Data Analyst",
  "Python Data Analyst",
  "Business Intelligence Analyst",
  "Power BI Developer",
  "Tableau Developer",
  "Analytics Engineer",
  "Cloud Data Engineer",
  "Data Visualization Specialist",
  "Data Quality Analyst",
  "Data Governance Analyst",
  "Marketing Data Analyst",
  "Financial Data Analyst",
  "Healthcare Data Analyst",
  "HR Data Analyst",
  "Operations Research Analyst",
  "Risk Data Analyst",
  "Customer Insights Analyst",
  "Full Stack Developer",
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Cloud Engineer",
  "DevOps Engineer",
  "AWS Cloud Engineer",
  "Azure Administrator",
  "Business Analyst",
  "Cyber Security Analyst",
  "Data Engineer",
  "Digital Marketing",
  "Product Manager",
  "Project Manager",
  "UI UX Designer",
  "Power BI Analyst",
  "React Developer",
  "Python Developer",
  "Java Developer",
  "SQL Developer",
  "Node.js Developer",
  "Android Developer",
  "Automation Tester",
  "Marketing Manager",
  "Sales Executive",
  "HR Recruiter",
  "Finance Analyst",
  "Accounting Assistant",
  "Customer Support",
  "Content Writer",
  "Graphic Designer",
  "Accountant",
  "Administrative Assistant",
  "Application Developer",
  "Architect",
  "Art Director",
  "Assistant Manager",
  "Banking Associate",
  "Brand Manager",
  "Business Development Executive",
  "Data Entry Operator",
  "Marketing Analyst",
  "Machine Learning",
  "Machine Learning Lead",
  "Machine Learning Advisor",
  "Machine Learning Manager",
  "Machinify",
  "MachineMetrics",
  "Machine Operator",
  "Mechanical Engineer",
  "Office Assistant",
  "Operations Executive",
  "Project Coordinator",
  "Social Media Manager",
  "Teacher",
  "Technical Support Engineer",
  "Excel Specialist",
  ...skillSuggestionOptions,
];

const demandRank = new Map(searchSuggestionOptions.map((item, index) => [item.toLowerCase(), index]));

const sortByDemand = (items: string[]) =>
  [...items].sort((a, b) => (demandRank.get(a.toLowerCase()) ?? 999) - (demandRank.get(b.toLowerCase()) ?? 999));

const Index = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("job-ai-token"));
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [resumeJobs, setResumeJobs] = useState<JobRecommendation[]>([]);
  const [dashboardSearchResults, setDashboardSearchResults] = useState<JobRecommendation[]>([]);
  const [searchResults, setSearchResults] = useState<JobRecommendation[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobRecommendation[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<JobRecommendation[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [gap, setGap] = useState<SkillGap | null>(null);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [trackedFilter, setTrackedFilter] = useState("");
  const [status, setStatus] = useState("");
  const [recommendMode, setRecommendMode] = useState<RecommendMode>("manual");
  const [manualProfile, setManualProfile] = useState<Profile>(emptyProfile);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => (p < 95 ? p + 1 : p));
    }, 60); // ~5.7 seconds expected duration
    return () => clearInterval(interval);
  }, [loading]);


  const skillList = useMemo(() => splitSkills(profile.skills).slice(0, 8), [profile.skills]);
  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const trackedTitles = [...savedJobs, ...appliedJobs].map((job) => job.title);
    const contextOptions =
      activeView === "applications"
        ? trackedTitles
        : activeView === "roadmap"
          ? ["Data Analyst Roadmap", "Machine Learning Roadmap", "Digital Marketing Roadmap", "Sales Roadmap", "HR Roadmap"]
          : activeView === "profile"
            ? ["Machine Learning Engineer", "Data Analyst", "Digital Marketing", "Sales Executive", "HR Recruiter"]
            : searchSuggestionOptions;
    const options = [...new Set([...contextOptions, ...searchSuggestionOptions])];
    const startsWith = options.filter((item) => item.toLowerCase().startsWith(query));
    const wordStartsWith = options.filter((item) =>
      item
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.startsWith(query)),
    );
    const contains = options.filter((item) => item.toLowerCase().includes(query));
    const directMatches = [
      ...sortByDemand(startsWith),
      ...sortByDemand(wordStartsWith.filter((item) => !startsWith.includes(item))),
      ...sortByDemand(contains.filter((item) => !startsWith.includes(item) && !wordStartsWith.includes(item))),
    ].slice(0, 12);
    if (directMatches.length) return directMatches;

    const readable = searchQuery.trim().replace(/\s+/g, " ");
    return [
      `${readable} Developer`,
      `${readable} Analyst`,
      `${readable} Manager`,
      `${readable} Specialist`,
      `${readable} Assistant`,
      `${readable} Executive`,
      `${readable} Internship`,
      `${readable} Jobs`,
    ];
  }, [activeView, appliedJobs, savedJobs, searchQuery]);
  const bestMatch = jobs[0]?.match || 0;
  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(user?.name),
      Boolean(profile.skills?.trim()),
      Boolean(profile.education?.trim()),
      Boolean(profile.experience?.trim()),
      Boolean(profile.location?.trim()),
      Boolean(profile.branch?.trim() || profile.university?.trim()),
      Boolean(profile.certifications?.trim() || profile.resume_text?.trim()),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile, user]);

  const fetchTrackedJobs = async (nextToken: string | null = token) => {
    if (!nextToken) return;
    const [saved, applied] = await Promise.all([
      apiGet<{ job_ids: number[]; jobs: JobRecommendation[] }>("/saved-jobs", nextToken),
      apiGet<{ job_ids: number[]; jobs: JobRecommendation[] }>("/applied-jobs", nextToken),
    ]);
    setSavedJobIds(saved.job_ids);
    setSavedJobs(saved.jobs);
    setAppliedJobIds(applied.job_ids);
    setAppliedJobs(applied.jobs);
  };

  const fetchAlerts = async (nextToken: string | null = token) => {
    if (!nextToken) return;
    const response = await apiGet<{ alerts: JobAlert[] }>("/job-alerts", nextToken);
    setAlerts(response.alerts);
  };

  const runRecommendation = async (nextProfile: Profile = profile, showStatus = true, openRecommendations = false) => {
    const hasRecommendationInput = [
      nextProfile.skills,
      nextProfile.location,
      nextProfile.experience,
      nextProfile.education,
      nextProfile.salary_expectation,
    ].some((value) => value?.trim());
    if (!hasRecommendationInput) {
      setJobs([]);
      setDashboardSearchResults([]);
      setSearchResults([]);
      setGap(null);
      setRoadmap([]);
      if (showStatus) setStatus("Enter skills or preferences, then click Recommend.");
      return;
    }
    setLoading(true);
    if (showStatus) setStatus("");
    try {
      const response = await apiPost<RecommendationResponse>("/recommend", { ...nextProfile, top_n: 5 }, token);
      setJobs(response.jobs);
      setGap(response.skill_gap);
      setRoadmap(response.roadmap);
      if (openRecommendations) {
        setDashboardSearchResults([]);
        if (activeView !== "dashboard") {
          setSearchResults([]);
        }
        setSearchQuery("");
        setSearchFocused(false);
        if (activeView !== "dashboard") {
          setActiveView("jobs");
        }
      }
      if (showStatus) setStatus(`Showing ${response.total} best matches for your profile.`);
      void fetchAlerts();
    } catch (err) {
      if (showStatus) setStatus(err instanceof Error ? err.message : "Recommendation failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    apiGet<{ user: AppUser; saved_job_ids: number[]; applied_job_ids: number[] }>("/profile", token)
      .then((response) => {
        const nextProfile = normalizeManualProfile({ ...emptyProfile, ...response.user.profile });
        setUser(response.user);
        setProfile(nextProfile);
        setManualProfile(emptyProfile);
        setSavedJobIds(response.saved_job_ids);
        setAppliedJobIds(response.applied_job_ids || []);
        void fetchTrackedJobs(token);
      })
      .catch(() => {
        localStorage.removeItem("job-ai-token");
        setToken(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAuth = (nextToken: string, nextUser: AppUser) => {
    localStorage.setItem("job-ai-token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
    const nextProfile = normalizeManualProfile({ ...emptyProfile, ...nextUser.profile });
    setProfile(nextProfile);
    setManualProfile(emptyProfile);
    setJobs([]);
    setResumeJobs([]);
    setDashboardSearchResults([]);
    setSearchResults([]);
    setRoadmap([]);
    setGap(null);
    setStatus("");
    setSearchQuery("");
    setSearchFocused(false);
  };

  const saveProfile = async () => {
    if (!token) {
      setStatus("Login to save your profile.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiPut<{ user: AppUser }>("/profile", profile, token);
      setUser(response.user);
      setStatus("Profile saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const searchJobs = async (queryOverride?: string) => {
    const nextQuery = queryOverride ?? searchQuery;
    if (queryOverride) setSearchQuery(queryOverride);
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        q: nextQuery || profile.skills,
        location: profile.location,
        role: "",
        min_salary: "",
        limit: "100",
      });
      const response = await apiGet<JobListingsResponse>(`/jobs?${params.toString()}`);
      setSearchResults(response.jobs);
      setStatus(`Found ${response.total.toLocaleString()} jobs.`);
      setActiveView("jobs");
      setSearchFocused(false);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Job search failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const refreshJobsPage = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        q: "",
        location: "",
        role: "",
        min_salary: "",
        limit: "100",
      });
      const response = await apiGet<JobListingsResponse>(`/jobs?${params.toString()}`);
      setSearchResults(response.jobs);
      setStatus(`Showing ${response.jobs.length} of ${response.total.toLocaleString()} dataset jobs. Use search to narrow results.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not refresh jobs.");
    } finally {
      setSearchLoading(false);
      setSearchFocused(false);
    }
  };

  const handleTopSearch = async (queryOverride?: string) => {
    const query = (queryOverride ?? searchQuery).trim();
    if (!query) return;

    if (activeView === "roadmap") {
      setSearchLoading(true);
      try {
        const response = await apiPost<{ roadmap: RoadmapStep[]; skill_gap: SkillGap }>(
          "/roadmap",
          { ...profile, target_role: query },
          token,
        );
        setRoadmap(response.roadmap);
        setGap(response.skill_gap);
        setStatus(`Roadmap updated for ${query}.`);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Roadmap search failed.");
      } finally {
        setSearchLoading(false);
        setSearchQuery("");
        setSearchFocused(false);
      }
      return;
    }

    if (activeView === "applications") {
      setTrackedFilter(query);
      setStatus(`Filtering applications by ${query}.`);
      setSearchQuery("");
      setSearchFocused(false);
      return;
    }

    if (activeView === "resume") {
      setStatus("Upload your resume on this page. Search is not needed here.");
      setSearchQuery("");
      setSearchFocused(false);
      return;
    }

    await searchJobs(query);
  };

  const toggleSave = async (jobId: number) => {
    if (!token) return setStatus("Login to save jobs.");
    const saved = savedJobIds.includes(jobId);
    const response = await fetch(`/api/saved-jobs/${jobId}`, {
      method: saved ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setSavedJobIds(data.saved_job_ids || []);
    await fetchTrackedJobs();
  };

  const applyJob = async (job: JobRecommendation) => {
    if (!token) return setStatus("Login to apply for jobs.");
    const jobId = job.id;
    const applied = appliedJobIds.includes(jobId);
    const applyTab = !applied && job.apply_url ? window.open("about:blank", "_blank", "noopener,noreferrer") : null;
    const response = await fetch(`/api/applied-jobs/${jobId}`, {
      method: applied ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setAppliedJobIds(data.applied_job_ids || []);
    await fetchTrackedJobs();
    if (applyTab && job.apply_url) {
      applyTab.location.href = job.apply_url;
    }
    setStatus(applied ? "Application removed." : "Job marked as applied.");
  };

  const logout = () => {
    localStorage.removeItem("job-ai-token");
    setToken(null);
    setUser(null);
    setJobs([]);
    setResumeJobs([]);
    setDashboardSearchResults([]);
    setSearchResults([]);
    setSavedJobs([]);
    setAppliedJobs([]);
    setSavedJobIds([]);
    setAppliedJobIds([]);
    setManualProfile(emptyProfile);
  };

  const openView = (view: View) => {
    setActiveView(view);
    setMobileNavOpen(false);
    setSearchQuery("");
    setSearchFocused(false);
    if (view !== "applications") setTrackedFilter("");
    if (view === "jobs") void refreshJobsPage();
    if (view === "roadmap") {
      setRoadmap([]);
      setGap(null);
    }
  };

  if (!user) {
    return <AuthPanel onAuth={handleAuth} />;
  }

  const updateManualProfile = (key: keyof Profile, value: string) => {
    setManualProfile((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9fff4_0,#f8fbff_36%,#eef3f8_100%)] text-slate-950">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/40 bg-[#0A192F]/95 px-5 py-6 text-white shadow-2xl backdrop-blur transition lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#64FFDA] text-[#0A192F]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-black tracking-tight">JobFinder</div>
              <div className="text-xs font-medium text-white/60">Simple career matching</div>
            </div>
          </div>
          <button type="button" title="Close menu" className="lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => openView(item.view)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                activeView === item.view ? "bg-[#64FFDA] text-[#0A192F]" : "text-white/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-auto flex w-full items-center gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </aside>

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
          <header className="relative z-40 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button type="button" title="Open menu" className="rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm lg:hidden" onClick={() => setMobileNavOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0A192F]">{viewTitles[activeView]}</h1>
                <p className="text-sm font-medium text-slate-500">Hi {user.name}, everything important is one click away.</p>
              </div>
            </div>

            <form
              className="relative z-50 flex rounded-2xl border border-white/70 bg-white p-1 shadow-xl shadow-slate-200/60 lg:min-w-[620px]"
              autoComplete="off"
              onSubmit={(event) => {
                event.preventDefault();
                void handleTopSearch();
                setSearchFocused(false);
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
                <Search className="h-6 w-6 text-slate-400" />
                <input
                  name="new-search-query-no-autofill"
                  className="h-12 min-w-0 flex-1 bg-transparent text-base font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  placeholder={activeView === "roadmap" ? "Search roadmap by dream role" : activeView === "applications" ? "Search saved or applied jobs" : "Search jobs by role, skill or company"}
                  value={searchQuery}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-autocomplete="list"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchFocused(true);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    title="Clear search"
                    onClick={() => setSearchQuery("")}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button type="submit" className="rounded-2xl bg-[#00ADB5] px-7 text-sm font-black text-white">
                {searchLoading ? "Searching" : "Search"}
              </button>

              {searchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="max-h-[304px] overflow-y-auto py-2">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setSearchQuery(suggestion);
                          setSearchFocused(false);
                          void handleTopSearch(suggestion);
                        }}
                        className="flex w-full items-center gap-4 px-5 py-3 text-left text-base font-semibold text-slate-900 hover:bg-[#64FFDA]/20"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300 bg-white">
                          <Search className="h-4 w-4 text-slate-800" />
                        </span>
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => openView("profile")} className="hidden items-center gap-3 rounded-xl border border-white/70 bg-white/85 px-3 py-2 text-left shadow-sm transition hover:border-[#00ADB5] sm:flex">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#0A192F] font-black text-white">{user.name?.[0]?.toUpperCase() || "U"}</div>
                <div>
                  <div className="text-sm font-black">{user.name}</div>
                  <div className="text-xs font-semibold text-slate-500">Job Seeker</div>
                </div>
              </button>
            </div>
          </header>

          {activeView === "dashboard" && (
            <div className="space-y-5">
                <section className="rounded-2xl border border-white/70 bg-white/85 p-6 shadow-lg shadow-slate-200/50 backdrop-blur">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div>
                      <div className="mb-3 inline-flex rounded-full bg-[#64FFDA]/25 px-3 py-1 text-xs font-black text-[#0A192F]">Smart recommendations ready</div>
                      <h2 className="max-w-3xl text-2xl font-black tracking-tight text-[#0A192F] md:text-3xl">Find simple, high-match jobs faster.</h2>
                      <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                        Search by skill or job role. Use Profile for resume upload and profile completion.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {skillList.slice(0, 5).map((skill) => (
                          <span key={skill} className="rounded-full bg-[#0A192F] px-3 py-1.5 text-xs font-bold text-white">{skill}</span>
                        ))}
                      </div>

                    </div>
                    <div className="rounded-2xl border border-[#00ADB5]/20 bg-[#64FFDA]/20 p-5">
                      <div className="text-sm font-black text-[#007a80]">Best Match</div>
                      <div className="mt-2 text-4xl font-black text-[#0A192F]">{bestMatch || 0}%</div>
                      <div className="mt-2 text-sm font-bold text-slate-600">Based on your inputs</div>
                      <button type="button" onClick={() => openView("profile")} className="mt-4 rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-black text-white">
                        Improve profile
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">Choose how to recommend jobs</h2>
                      <p className="text-sm text-slate-500">Use your saved profile or give quick preferences just for this search.</p>
                    </div>
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                      {(["manual", "profile"] as RecommendMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setRecommendMode(mode)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                            recommendMode === mode ? "bg-[#0A192F] text-white shadow-sm" : "text-slate-600"
                          }`}
                        >
                          {mode === "profile" ? "Use Profile" : "Manual Preferences"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {recommendMode === "profile" ? (
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#64FFDA]/30 bg-[#64FFDA]/12 p-4">
                      <div className="space-y-2">
                        <div className="text-sm font-black text-[#0A192F]">Profile-based recommendation</div>
                        <div className="flex flex-wrap gap-2">
                          {skillList.slice(0, 6).map((skill) => (
                            <span key={skill} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-slate-600">
                          Location: <span className="font-bold text-slate-900">{profile.location || "Any"}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void runRecommendation(profile, true, true)}
                        disabled={loading}
                        className="rounded-lg bg-[#00ADB5] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        {loading && recommendMode === "profile" ? `Finding... ${progress}%` : "Recommend from profile"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label className="text-sm font-bold text-slate-700">
                          Skills
                          <ManualSuggestField value={manualProfile.skills} onChange={(value) => updateManualProfile("skills", value)} placeholder="Python, Excel, Communication" suggestions={skillSuggestionOptions} appendComma />
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                          Location
                          <ManualSuggestField value={manualProfile.location} onChange={(value) => updateManualProfile("location", value)} placeholder="Others / Anywhere, Remote, Bangalore" suggestions={["Others / Anywhere", "Remote", "Bangalore", "Hyderabad", "Chennai", "Pune", "Mumbai", "Delhi", "Noida", "Gurgaon", "New York", "London"]} />
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                          Experience
                          <ManualSuggestField value={manualProfile.experience} onChange={(value) => updateManualProfile("experience", value)} placeholder="Fresher, 1-3 years" suggestions={["Fresher", "0-1 years", "1-3 years", "3-5 years", "5+ years", "Internship"]} />
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                          Salary expectation
                          <ManualSuggestField value={manualProfile.salary_expectation || ""} onChange={(value) => updateManualProfile("salary_expectation", value)} placeholder="6 LPA, $80k" suggestions={["3 LPA", "5 LPA", "6 LPA", "8 LPA", "10 LPA", "15 LPA", "$60k", "$80k", "$100k"]} />
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                          Education
                          <ManualSuggestField value={manualProfile.education} onChange={(value) => updateManualProfile("education", value)} placeholder="Bachelor, MBA, Diploma" suggestions={["Bachelor", "Master", "MBA", "Diploma", "PhD", "High School"]} />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-500">This does not overwrite the saved profile unless you save it later in Profile.</p>
                      <button
                        type="button"
                        onClick={() => void runRecommendation(manualProfile, true, true)}
                          disabled={
                            loading ||
                            ![
                              manualProfile.skills,
                              manualProfile.location,
                              manualProfile.experience,
                              manualProfile.education,
                              manualProfile.salary_expectation,
                            ].some((value) => value?.trim())
                          }
                          className="rounded-lg bg-[#00ADB5] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
                        >
                          {loading && recommendMode === "manual" ? `Finding... ${progress}%` : "Recommend from preferences"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon={Briefcase} label="Matches" value={jobs.length} helper={`${bestMatch || 0}% best score`} />
                  <StatCard icon={Bookmark} label="Saved" value={savedJobIds.length} helper="Shortlisted by you" />
                  <StatCard icon={ClipboardList} label="Applied" value={appliedJobIds.length} helper="Application tracker" />
                  <StatCard
                    icon={CheckCircle2}
                    label="Profile"
                    value={`${profileCompletion}%`}
                    helper="Click to complete profile"
                    onClick={() => openView("profile")}
                  />
                </section>

                <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-950">{dashboardSearchResults.length ? "Search Results" : "Recommended Jobs"}</h2>
                      <p className="text-sm text-slate-500">Click a job title to read the job description.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(dashboardSearchResults.length > 0 || jobs.length > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setJobs([]);
                            setDashboardSearchResults([]);
                            setStatus("Recommendations cleared.");
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      )}
                      <button type="button" onClick={() => void runRecommendation(profile, true, true)} disabled={loading} className="rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                        {loading ? `Finding... ${progress}%` : "Recommend"}
                      </button>
                    </div>
                  </div>
                  {status && <div className="mb-4 rounded-lg bg-[#64FFDA]/20 px-3 py-2 text-sm font-bold text-[#0A192F]">{status}</div>}
                  <JobList jobs={dashboardSearchResults.length ? dashboardSearchResults : jobs} empty="No recommendations yet. Enter profile or manual preferences, then click Recommend." savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />
                </section>
            </div>
          )}

          {activeView === "profile" && (
            <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
              <div className="space-y-5">
                <ProfileForm profile={profile} loading={loading} onChange={setProfile} onSave={saveProfile} onRecommend={() => void runRecommendation(profile, true, true)} />
              </div>
              <aside className="space-y-5">
                <ProfileSummary profileCompletion={profileCompletion} profile={profile} />
              </aside>
            </div>
          )}

          {activeView === "resume" && (
            <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
              <div className="space-y-5">
                <ResumeAnalyzer
                  token={token}
                  experience={profile.experience}
                  education={profile.education}
                  location={profile.location}
                  onAnalysis={(nextJobs, nextGap, skills, nextRoadmap) => {
                    setResumeJobs(nextJobs);
                    setJobs(nextJobs);
                    setGap(nextGap);
                    setRoadmap(nextRoadmap);
                    setSearchResults([]);
                    setStatus(`Resume analyzed. ${skills.length} skills extracted. Showing ${nextJobs.length} resume-based job matches below.`);
                  }}
                  onRecommend={(skills) => {
                    const resumeProfile = { ...profile, skills: skills.join(", ") || profile.skills };
                    void runRecommendation(resumeProfile, true, true);
                  }}
                />
                {resumeJobs.length > 0 && (
                  <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-950">Resume Recommended Jobs</h2>
                        <p className="text-sm text-slate-500">These matches are based only on skills extracted from your resume.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResumeJobs([]);
                            setJobs([]);
                            setStatus("Resume recommendations cleared.");
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView("jobs")}
                          className="rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-bold text-white"
                        >
                          Open Jobs Page
                        </button>
                      </div>
                    </div>
                    <JobList jobs={resumeJobs} empty="Upload and analyze a resume to see matches." savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />
                  </section>
                )}
                <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
                  <h2 className="text-xl font-bold text-slate-950">What happens after upload?</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["Extract skills", "Recommend matching jobs", "Keep profile unchanged"].map((item) => (
                      <div key={item} className="rounded-xl bg-[#64FFDA]/20 px-4 py-3 text-sm font-black text-[#0A192F]">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <aside className="space-y-5">
                <ProfileSummary profileCompletion={profileCompletion} profile={profile} />
                <SkillGapPanel gap={gap} totalJobs={jobs.length} />
              </aside>
            </div>
          )}

          {activeView === "jobs" && (
            <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Search Jobs</h2>
                  <p className="text-sm text-slate-500">Use the search chips or top search bar to find jobs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshJobsPage()}
                  disabled={searchLoading}
                  className="rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {searchLoading ? "Refreshing..." : "Refresh Jobs"}
                </button>
              </div>

              <JobList jobs={searchResults} empty="Click Refresh Jobs to load dataset jobs, or search for a role or skill." savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />
            </section>
          )}

          {activeView === "applications" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <TrackedJobs title="Saved Jobs" jobs={filterJobs(savedJobs, trackedFilter)} empty="Save jobs to compare them later." savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />
              <TrackedJobs title="Applied Jobs" jobs={filterJobs(appliedJobs, trackedFilter)} empty="Applied jobs will appear here." savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={toggleSave} onApply={applyJob} />
            </div>
          )}

          {activeView === "roadmap" && (
            <div className="space-y-5">
              <RoadmapTimeline token={token} profile={profile} initialRoadmap={roadmap} initialGap={gap} />
              <InterviewPrepPanel token={token} profile={profile} gap={gap} />
            </div>
          )}

        </div>
      </main>

      <CareerChatbot token={token} />
    </div>
  );
};

interface StatCardProps {
  icon: typeof Briefcase;
  label: string;
  value: number | string;
  helper: string;
  onClick?: () => void;
}

const ManualSuggestField = ({
  value,
  onChange,
  placeholder,
  suggestions,
  appendComma = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  appendComma?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const query = appendComma ? value.split(",").at(-1)?.trim().toLowerCase() || "" : value.trim().toLowerCase();
  const matches = useMemo(() => {
    const base = [...new Set(suggestions)];
    if (!query) return base.slice(0, 8);
    const startsWith = base.filter((item) => item.toLowerCase().startsWith(query));
    const wordStartsWith = base.filter((item) =>
      item
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.startsWith(query)),
    );
    const contains = base.filter((item) => item.toLowerCase().includes(query));
    return [
      ...startsWith,
      ...wordStartsWith.filter((item) => !startsWith.includes(item)),
      ...contains.filter((item) => !startsWith.includes(item) && !wordStartsWith.includes(item)),
    ].slice(0, 8);
  }, [query, suggestions]);

  const pick = (suggestion: string) => {
    if (!appendComma) {
      onChange(suggestion);
      return;
    }
    const previous = value.split(",").slice(0, -1).map((item) => item.trim()).filter(Boolean);
    onChange([...previous, suggestion].join(", "));
  };

  return (
    <div className="relative mt-1">
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium outline-none focus:border-[#00ADB5]"
        value={value}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
      />
      {focused && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="max-h-44 overflow-y-auto py-1">
            {matches.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(suggestion);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-[#64FFDA]/20"
              >
                <Search className="h-4 w-4 text-slate-500" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, helper, onClick }: StatCardProps) => (
  <article
    className={`rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur transition hover:-translate-y-0.5 ${
      onClick ? "cursor-pointer hover:border-[#00ADB5]/50" : ""
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#64FFDA]/30 text-[#0A192F]">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-black text-[#0A192F]">{value}</div>
        <div className="text-sm font-bold text-slate-600">{label}</div>
      </div>
    </div>
    <div className="mt-4 text-xs font-bold text-[#00ADB5]">{helper}</div>
  </article>
);



const filterJobs = (jobs: JobRecommendation[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return jobs;
  return jobs.filter((job) =>
    [job.title, job.company, job.location, job.skills, job.type]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
};

const JobList = ({
  jobs,
  empty = "Complete your profile and run recommendations.",
  savedJobIds,
  appliedJobIds,
  onToggleSave,
  onApply,
}: {
  jobs: JobRecommendation[];
  empty?: string;
  savedJobIds: number[];
  appliedJobIds: number[];
  onToggleSave: (jobId: number) => void;
  onApply: (job: JobRecommendation) => void;
}) => (
  <div className="space-y-3">
    {jobs.length ? (
      jobs.map((job) => (
        <RecommendationCard
          key={job.id}
          job={job}
          saved={savedJobIds.includes(job.id)}
          applied={appliedJobIds.includes(job.id)}
          onToggleSave={onToggleSave}
          onApply={onApply}
        />
      ))
    ) : (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
        {empty}
      </div>
    )}
  </div>
);

const ProfileSummary = ({ profileCompletion, profile }: { profileCompletion: number; profile: Profile }) => (
  <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
    <h2 className="mb-4 text-lg font-bold text-slate-950">Profile Completion</h2>
    <div className="flex items-center gap-4">
      <div className="grid h-24 w-24 place-items-center rounded-full" style={{ background: `conic-gradient(#00ADB5 ${profileCompletion * 3.6}deg, #e9eef5 0deg)` }}>
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-xl font-black text-[#0A192F]">{profileCompletion}%</div>
      </div>
      <div className="text-sm font-medium leading-6 text-slate-600">
        Location: <span className="font-bold text-[#0A192F]">{profile.location || "Any"}</span>
      </div>
    </div>
  </section>
);

const AlertPanel = ({ alerts }: { alerts: JobAlert[] }) => (
  <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
    <div className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-950">
      <Sparkles className="h-5 w-5 text-[#00ADB5]" />
      Job Alerts
    </div>
    <div className="space-y-2">
      {alerts.length ? alerts.slice(0, 3).map((alert) => (
        <div key={alert.id} className="rounded-lg bg-[#64FFDA]/20 px-3 py-2 text-sm font-semibold text-[#0A192F]">
          {alert.message}
        </div>
      )) : <p className="text-sm font-medium text-slate-500">High-match alerts will appear after recommendations.</p>}
    </div>
  </section>
);

const TrackedJobs = ({
  title,
  jobs,
  empty,
  savedJobIds,
  appliedJobIds,
  onToggleSave,
  onApply,
}: {
  title: string;
  jobs: JobRecommendation[];
  empty: string;
  savedJobIds: number[];
  appliedJobIds: number[];
  onToggleSave: (jobId: number) => void;
  onApply: (job: JobRecommendation) => void;
}) => (
  <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
    <div className="mb-4 flex items-center gap-2">
      <FileText className="h-5 w-5 text-[#00ADB5]" />
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
    </div>
    {jobs.length ? <JobList jobs={jobs} savedJobIds={savedJobIds} appliedJobIds={appliedJobIds} onToggleSave={onToggleSave} onApply={onApply} /> : <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">{empty}</div>}
  </section>
);

export default Index;
