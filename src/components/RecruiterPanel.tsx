import { useEffect, useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { apiGet, apiPost, Candidate, RecruiterJob } from "@/lib/api";

interface Props {
  token: string | null;
}

const RecruiterPanel = ({ token }: Props) => {
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("python sql");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    title: "Data Analyst",
    company: "Your Company",
    location: "Remote",
    salary: "Not listed",
    experience: "1-3 years",
    skills: "Python, SQL, Excel",
    description: "Analyze data, build dashboards, and communicate insights.",
  });

  const load = async () => {
    const response = await apiGet<{ jobs: RecruiterJob[] }>("/recruiter/jobs", token);
    setJobs(response.jobs);
  };

  const searchCandidates = async () => {
    const response = await apiGet<{ candidates: Candidate[] }>(`/recruiter/candidates?q=${encodeURIComponent(query)}`, token);
    setCandidates(response.candidates);
  };

  useEffect(() => {
    void load();
    void searchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postJob = async () => {
    try {
      const response = await apiPost<{ job: RecruiterJob }>("/recruiter/jobs", form, token);
      setJobs((current) => [response.job, ...current]);
      setStatus("Job posted.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not post job.");
    }
  };

  const shortlist = async (candidateId: number) => {
    await apiPost("/recruiter/shortlist", { candidate_id: candidateId, job_id: jobs[0]?.id }, token);
    setStatus("Candidate shortlisted.");
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
        <h2 className="text-xl font-bold text-slate-950">Post a Job</h2>
        <p className="mb-4 text-sm text-slate-500">A compact recruiter form for vacancies.</p>
        <div className="grid gap-3">
          {(["title", "company", "location", "salary", "experience", "skills"] as const).map((key) => (
            <input
              key={key}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#00ADB5]"
              value={form[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={key}
            />
          ))}
          <textarea
            className="min-h-24 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#00ADB5]"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Job description"
          />
          <button type="button" onClick={postJob} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A192F] px-4 py-2.5 text-sm font-bold text-white">
            <Plus className="h-4 w-4" />
            Add Job
          </button>
          {status && <div className="rounded-lg bg-[#64FFDA]/20 px-3 py-2 text-sm font-bold text-[#0A192F]">{status}</div>}
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Search Candidates</h2>
              <p className="text-sm text-slate-500">Resume ranking from profile skills.</p>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void searchCandidates();
              }}
            >
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#00ADB5]" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button type="submit" title="Search candidates" className="rounded-lg bg-[#00ADB5] p-2 text-white">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
          <div className="space-y-3">
            {candidates.length ? candidates.map((candidate) => (
              <article key={candidate.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-950">{candidate.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{candidate.preferred_role || candidate.education || "Candidate"} • {candidate.location || "Any location"}</p>
                  <p className="mt-2 line-clamp-1 text-sm text-slate-600">{candidate.skills}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#64FFDA]/30 px-3 py-1.5 text-xs font-bold text-[#0A192F]">{candidate.resume_rank || 50}% Rank</span>
                  <button type="button" onClick={() => shortlist(candidate.id)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">
                    <Star className="h-4 w-4" />
                    Shortlist
                  </button>
                </div>
              </article>
            )) : <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">No candidates yet. Ask users to complete profiles.</div>}
          </div>
        </section>

        <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
          <h2 className="mb-3 text-xl font-bold text-slate-950">Posted Jobs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {jobs.slice(0, 4).map((job) => (
              <article key={job.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-slate-950">{job.title}</h3>
                <p className="text-sm font-medium text-slate-500">{job.company} • {job.location}</p>
                <p className="mt-2 text-sm text-slate-600">{job.skills}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export default RecruiterPanel;
