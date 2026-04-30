import { CheckCircle2, Bookmark } from "lucide-react";
import { JobRecommendation } from "@/lib/api";

interface Props {
  savedJobs: JobRecommendation[];
  appliedJobs: JobRecommendation[];
}

const TrackedJobs = ({ savedJobs, appliedJobs }: Props) => {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold">Tracked Jobs</h2>
      <p className="mb-4 text-sm text-muted-foreground">Saved and applied jobs from your dashboard.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Bookmark className="h-4 w-4 text-primary" />
            Saved
          </div>
          <div className="space-y-2">
            {savedJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-md border px-3 py-2">
                <div className="text-sm font-medium">{job.title}</div>
                <div className="text-xs text-muted-foreground">{job.company}</div>
              </div>
            ))}
            {!savedJobs.length && <div className="text-sm text-muted-foreground">No saved jobs yet.</div>}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Applied
          </div>
          <div className="space-y-2">
            {appliedJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-md border px-3 py-2">
                <div className="text-sm font-medium">{job.title}</div>
                <div className="text-xs text-muted-foreground">{job.company}</div>
              </div>
            ))}
            {!appliedJobs.length && <div className="text-sm text-muted-foreground">No applied jobs yet.</div>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackedJobs;
