import { useState, useMemo } from "react";
import type { RecommendedJob } from "@/pages/Index";
import JobCard from "./JobCard";
import FilterSidebar, { Filters } from "./FilterSidebar";
import { SearchX } from "lucide-react";

interface Props {
  show: boolean;
  jobs: RecommendedJob[];
}

const Results = ({ show, jobs }: Props) => {
  const [filters, setFilters] = useState<Filters>({
    types: [],
    salary: 0,
    experience: [],
  });

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.types.length && !filters.types.includes(j.type)) return false;
      if (filters.experience.length && !filters.experience.includes(j.experience)) return false;
      const min = parseInt(j.salary.replace(/[^0-9]/g, "").slice(0, 3));
      if (min < filters.salary) return false;
      return true;
    });
  }, [filters, jobs]);

  if (!show) return null;

  return (
    <section className="container pb-20">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-bold mb-2">
          Recommended <span className="text-gradient">For You</span>
        </h2>
        <p className="text-muted-foreground">
          Showing {filtered.length} jobs matching your profile
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <FilterSidebar filters={filters} setFilters={setFilters} />

        <div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center animate-fade-in">
              <div className="h-16 w-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                <SearchX className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No jobs found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters to see more opportunities.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {filtered.map((job, i) => (
                <JobCard key={job.id} job={job} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Results;
