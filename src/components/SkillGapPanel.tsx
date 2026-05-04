import { Target } from "lucide-react";
import { SkillGap } from "@/lib/api";

interface Props {
  gap: SkillGap | null;
  totalJobs: number;
}

const SkillGapPanel = ({ gap, totalJobs }: Props) => {
  return (
    <aside className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
      <div className="mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Skill Gap</h2>
          <p className="text-sm text-slate-500">A short list to improve your matches.</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#64FFDA]/20 p-3">
          <div className="text-xl font-black text-[#0A192F]">{totalJobs}</div>
          <div className="text-xs font-semibold text-slate-500">matches</div>
        </div>
        <div className="rounded-xl bg-[#00ADB5]/10 p-3">
          <div className="text-xl font-black text-[#0A192F]">{Math.min(gap?.missing.length || 0, 5)}</div>
          <div className="text-xs font-semibold text-slate-500">tips</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-[#00ADB5]" />
          Learn Next
        </div>
        <div className="flex flex-wrap gap-1.5">
          {gap?.missing.length ? gap.missing.slice(0, 5).map((skill) => (
            <span key={skill} className="rounded-full bg-[#0A192F] px-2.5 py-1 text-xs font-bold text-white">
              {skill}
            </span>
          )) : <span className="text-sm text-slate-500">Run recommendations to see tips.</span>}
        </div>
      </div>
    </aside>
  );
};

export default SkillGapPanel;
