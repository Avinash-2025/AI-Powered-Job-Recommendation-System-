import { useState } from "react";
import { Bookmark, CheckCircle2, ChevronDown, ExternalLink, FileText, MapPin, Users } from "lucide-react";
import { JobRecommendation } from "@/lib/api";

interface Props {
  job: JobRecommendation;
  saved: boolean;
  applied?: boolean;
  onToggleSave: (jobId: number) => void;
  onApply?: (job: JobRecommendation) => void;
}

const RecommendationCard = ({ job, saved, applied = false, onToggleSave, onApply }: Props) => {
  const [open, setOpen] = useState(false);
  const match = job.match || 0;
  const matchedSkills = job.matched_skills || [];
  const missingSkills = (job.missing_skills || []).filter(Boolean).slice(0, 4);
  const displaySkills = (matchedSkills.length ? matchedSkills : job.skills.split(/[.;,]/)).map((skill) => skill.trim()).filter(Boolean).slice(0, 3);
  const companyInitial = (job.company || job.title || "J").slice(0, 1).toUpperCase();
  const interestedCount = job.popularity || 120 + ((job.id * 37) % 880);
  const description = job.description?.trim() || "No detailed job description is available for this role.";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#00ADB5]/50 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-slate-200 bg-[#64FFDA]/25 text-xl font-black text-[#0A192F]">
            {companyInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="group inline-flex min-w-0 items-center gap-1 text-left"
                title="Show job details"
              >
                <span className="truncate text-base font-black text-slate-950 group-hover:text-[#007a80]">{job.title}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {applied && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Applied
                </span>
              )}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
              <span>{job.company || "Company"}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location || "Remote"}
              </span>
              <span>{job.type || "Full-time"}</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {interestedCount.toLocaleString()} interested
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displaySkills.map((skill) => (
                <span key={skill} className="rounded-full bg-[#00ADB5]/10 px-2.5 py-1 text-xs font-bold text-[#007a80]">
                  {skill}
                </span>
              ))}
            </div>
            {missingSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Skill Gap</span>
                {missingSkills.map((skill) => (
                  <span key={skill} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
          {match > 0 && (
            <span className="rounded-full bg-[#64FFDA]/30 px-3 py-2 text-xs font-black text-[#0A192F]">
              {match}% Match
            </span>
          )}
          <button
            type="button"
            title={saved ? "Unsave job" : "Save job"}
            onClick={() => onToggleSave(job.id)}
            className={`rounded-lg border p-2 ${saved ? "border-[#00ADB5]/30 bg-[#00ADB5]/10 text-[#007a80]" : "border-slate-200 bg-white text-slate-500"}`}
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
          </button>
          {onApply && (
            <button
              type="button"
              title={applied ? "Remove from applied jobs" : "Apply to job"}
              onClick={() => onApply(job)}
              className={`rounded-lg px-5 py-2 text-sm font-black ${applied ? "border border-slate-200 bg-white text-slate-600" : "bg-[#0A192F] text-white shadow-sm"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                {applied ? "Applied" : "Apply"}
                {!applied && <ExternalLink className="h-3.5 w-3.5" />}
              </span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-[#00ADB5]/20 bg-slate-50/80 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#0A192F]">
            <FileText className="h-4 w-4 text-[#00ADB5]" />
            Job Description
          </div>
          <p className="text-sm font-medium leading-6 text-slate-600">{description}</p>
        </div>
      )}
    </article>
  );
};

export default RecommendationCard;
