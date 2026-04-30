import type { RecommendedJob } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, DollarSign, ArrowUpRight, CheckCircle2 } from "lucide-react";

const JobCard = ({ job, index }: { job: RecommendedJob; index: number }) => {
  const matchColor =
    job.match >= 90 ? "text-success" : job.match >= 80 ? "text-primary" : "text-accent";

  return (
    <div
      className="group rounded-2xl border border-border/60 gradient-card p-6 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-smooth animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-2xl shadow-soft">
            {job.logo}
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-smooth">
              {job.title}
            </h3>
            <p className="text-sm text-muted-foreground">{job.company}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${matchColor}`}>{job.match}%</div>
          <div className="text-xs text-muted-foreground">Match</div>
        </div>
      </div>

      {/* Match progress bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full gradient-hero rounded-full transition-all duration-1000"
          style={{ width: `${job.match}%` }}
        />
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>

      {/* Matched Skills */}
      {job.matched_skills && job.matched_skills.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1.5">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span className="text-xs font-medium text-success">Skills Matched</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {job.matched_skills.slice(0, 6).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {job.matched_skills.length > 6 && (
              <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
                +{job.matched_skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <Badge variant="secondary" className="font-normal">
          <MapPin className="h-3 w-3 mr-1" /> {job.location}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          <Briefcase className="h-3 w-3 mr-1" /> {job.type}
        </Badge>
        <Badge variant="secondary" className="font-normal">
          <DollarSign className="h-3 w-3 mr-1" /> {job.salary}
        </Badge>
      </div>

      <Button className="w-full gradient-hero border-0 shadow-soft group-hover:shadow-glow transition-smooth">
        Apply Now
        <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Button>
    </div>
  );
};

export default JobCard;
