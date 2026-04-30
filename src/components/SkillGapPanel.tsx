import { BarChart3, CheckCircle2, Target } from "lucide-react";
import { SkillGap } from "@/lib/api";

interface Props {
  gap: SkillGap | null;
  totalJobs: number;
}

const SkillGapPanel = ({ gap, totalJobs }: Props) => {
  return (
    <aside className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Recommendation summary and skill-gap analysis</p>
        </div>
        <BarChart3 className="h-6 w-6 text-primary" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-secondary p-3">
          <div className="text-2xl font-bold text-primary">{totalJobs}</div>
          <div className="text-xs text-muted-foreground">recommended jobs</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="text-2xl font-bold text-primary">{gap?.missing.length || 0}</div>
          <div className="text-xs text-muted-foreground">skills to learn</div>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Strengths
        </div>
        <div className="flex flex-wrap gap-1.5">
          {gap?.matched.length ? gap.matched.map((skill) => (
            <span key={skill} className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
              {skill}
            </span>
          )) : <span className="text-sm text-muted-foreground">Run recommendations to see matched skills.</span>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-amber-700" />
          Learn Next
        </div>
        <div className="flex flex-wrap gap-1.5">
          {gap?.missing.length ? gap.missing.map((skill) => (
            <span key={skill} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              {skill}
            </span>
          )) : <span className="text-sm text-muted-foreground">Skill gaps will appear here.</span>}
        </div>
      </div>
    </aside>
  );
};

export default SkillGapPanel;
