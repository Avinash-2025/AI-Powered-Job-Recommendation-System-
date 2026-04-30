import { Bookmark, Briefcase, DollarSign, MapPin } from "lucide-react";
import { JobRecommendation } from "@/lib/api";

interface Props {
  job: JobRecommendation;
  saved: boolean;
  applied?: boolean;
  onToggleSave: (jobId: number) => void;
  onApply?: (jobId: number) => void;
}

const RecommendationCard = ({ job, saved, applied = false, onToggleSave, onApply }: Props) => {
  const match = job.match || 0;
  const matchedSkills = job.matched_skills || [];
  const missingSkills = job.missing_skills || [];
  const scoreColor = match >= 60 ? "text-success" : match >= 35 ? "text-primary" : "text-amber-600";

  return (
    <article className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>{match ? `${match}%` : "--"}</div>
            <div className="text-xs text-muted-foreground">{match ? "match" : "listing"}</div>
          </div>
          <button
            type="button"
            title={saved ? "Unsave job" : "Save job"}
            onClick={() => onToggleSave(job.id)}
            className={`rounded-md border p-2 ${saved ? "bg-secondary text-primary" : "bg-white"}`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${match}%` }} />
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{job.description}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <MapPin className="h-3 w-3" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <Briefcase className="h-3 w-3" />
          {job.experience}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <DollarSign className="h-3 w-3" />
          {job.salary}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-success">Matched Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.length ? matchedSkills.map((skill) => (
              <span key={skill} className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                {skill}
              </span>
            )) : <span className="text-xs text-muted-foreground">No direct skill overlap</span>}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-amber-700">Skill Gap</div>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.slice(0, 6).map((skill) => (
              <span key={skill} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {onApply && (
        <button
          type="button"
          onClick={() => onApply(job.id)}
          className={`mt-4 w-full rounded-md px-4 py-2 text-sm font-semibold ${applied ? "border bg-white text-foreground" : "bg-primary text-primary-foreground"}`}
        >
          {applied ? "Applied" : "Apply Job"}
        </button>
      )}
    </article>
  );
};

export default RecommendationCard;
