import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { apiPost, InterviewPrepResponse, Profile, SkillGap } from "@/lib/api";

interface Props {
  token: string | null;
  profile: Profile;
  gap: SkillGap | null;
}

const InterviewPrepPanel = ({ token, profile, gap }: Props) => {
  const [prep, setPrep] = useState<InterviewPrepResponse | null>(null);
  const role = profile.preferred_role || "your target role";

  useEffect(() => {
    apiPost<InterviewPrepResponse>("/interview-prep", { role, skills: profile.skills || gap?.matched.join(", ") }, token)
      .then(setPrep)
      .catch(() => setPrep(null));
  }, [gap, profile.skills, role, token]);

  return (
    <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#64FFDA]/30 text-[#0A192F]">
          <MessageSquareText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Interview Prep</h2>
          <p className="text-sm text-slate-500">Questions and tips for {prep?.role || role}.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-bold text-slate-700">Common Questions</div>
          <div className="space-y-2">
            {(prep?.questions || []).slice(0, 5).map((question) => (
              <div key={question} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                {question}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-bold text-slate-700">Tips</div>
          <div className="space-y-2">
            {(prep?.tips || []).map((tip) => (
              <div key={tip} className="rounded-lg bg-[#0A192F] px-3 py-2 text-sm font-medium text-white">
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InterviewPrepPanel;
