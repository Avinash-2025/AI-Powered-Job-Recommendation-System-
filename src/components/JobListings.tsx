import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiGet, JobListingsResponse, JobRecommendation } from "@/lib/api";
import RecommendationCard from "./RecommendationCard";

interface Props {
  savedJobIds: number[];
  appliedJobIds: number[];
  onToggleSave: (jobId: number) => void;
  onApply: (jobId: number) => void;
}

const JobListings = ({ savedJobIds, appliedJobIds, onToggleSave, onApply }: Props) => {
  const [jobs, setJobs] = useState<JobRecommendation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    location: "",
  });

  const loadJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "6",
      q: filters.q,
      location: filters.location,
      role: "",
      min_salary: "",
    });
    try {
      const response = await apiGet<JobListingsResponse>(`/jobs?${params.toString()}`);
      setJobs(response.jobs);
      setTotal(response.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Search Jobs</h2>
          <p className="text-sm text-muted-foreground">Find roles by keyword and location.</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_120px]">
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Skill or role, e.g. Python" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
        <button type="button" onClick={loadJobs} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        {loading ? "Loading jobs..." : `${total.toLocaleString()} jobs found. Showing best ${jobs.length}.`}
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => (
          <RecommendationCard
            key={job.id}
            job={job}
            saved={savedJobIds.includes(job.id)}
            applied={appliedJobIds.includes(job.id)}
            onToggleSave={onToggleSave}
            onApply={onApply}
          />
        ))}
      </div>
    </section>
  );
};

export default JobListings;
