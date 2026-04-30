import { useEffect, useState } from "react";
import { BriefcaseBusiness, Filter, Search } from "lucide-react";
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
    role: "",
    minSalary: "",
  });

  const loadJobs = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "12",
      q: filters.q,
      location: filters.location,
      role: filters.role,
      min_salary: filters.minSalary,
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
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary">
            <BriefcaseBusiness className="h-4 w-4" />
            Real Job Listings
          </div>
          <h2 className="text-xl font-semibold">Search Available Jobs</h2>
          <p className="text-sm text-muted-foreground">Keyword search with location, role, and salary filters.</p>
        </div>
        <button type="button" onClick={loadJobs} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Keyword: Python, React..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Location: Remote" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
        <input className="rounded-md border px-3 py-2 text-sm" placeholder="Role: Analyst" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} />
        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Filter className="h-4 w-4" />
          <input className="min-w-0 flex-1 outline-none" placeholder="Min salary" value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })} />
        </label>
      </div>

      <div className="mb-3 text-sm text-muted-foreground">
        {loading ? "Loading jobs..." : `Showing ${jobs.length} of ${total.toLocaleString()} matching jobs`}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
