import { useMemo, useState } from "react";
import { CheckCircle2, Flag, Search, X } from "lucide-react";
import { apiPost, Profile, RoadmapStep, SkillGap } from "@/lib/api";

interface Props {
  token: string | null;
  profile: Profile;
  initialRoadmap: RoadmapStep[];
  initialGap: SkillGap | null;
}

const roadmapRoleSuggestions = [
  "AI Engineer",
  "Machine Learning Engineer",
  "Data Analyst",
  "Data Scientist",
  "Software Engineer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Cloud Engineer",
  "DevOps Engineer",
  "Cyber Security Analyst",
  "Business Analyst",
  "Product Manager",
  "Project Manager",
  "Digital Marketing",
  "Marketing Manager",
  "Sales Executive",
  "HR Recruiter",
  "Accounting Assistant",
  "Customer Support",
  "Content Writer",
  "Graphic Designer",
  "Teacher",
  "Operations Executive",
];

const RoadmapTimeline = ({ token, profile, initialRoadmap, initialGap }: Props) => {
  const [targetRole, setTargetRole] = useState(profile.preferred_role || "Machine Learning Engineer");
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>(initialRoadmap);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    const query = targetRole.trim().toLowerCase();
    if (!query) return roadmapRoleSuggestions.slice(0, 8);
    const startsWith = roadmapRoleSuggestions.filter((role) => role.toLowerCase().startsWith(query));
    const wordStartsWith = roadmapRoleSuggestions.filter((role) =>
      role
        .toLowerCase()
        .split(/\s+/)
        .some((word) => word.startsWith(query)),
    );
    const contains = roadmapRoleSuggestions.filter((role) => role.toLowerCase().includes(query));
    const matches = [
      ...startsWith,
      ...wordStartsWith.filter((role) => !startsWith.includes(role)),
      ...contains.filter((role) => !startsWith.includes(role) && !wordStartsWith.includes(role)),
    ];
    if (matches.length) return matches.slice(0, 10);
    const readable = targetRole.trim().replace(/\s+/g, " ");
    return [`${readable} Analyst`, `${readable} Manager`, `${readable} Specialist`, `${readable} Assistant`];
  }, [targetRole]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiPost<{ roadmap: RoadmapStep[]; skill_gap: SkillGap }>(
        "/roadmap",
        { ...profile, target_role: targetRole },
        token,
      );
      setRoadmap(response.roadmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate roadmap.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Dream Job Roadmap</h2>
          <p className="text-sm text-slate-500">Plain steps for any role: learn, prove, prepare, apply.</p>
        </div>
        <div className="relative flex w-full gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="roadmap-role-search"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium outline-none focus:border-[#00ADB5]"
              value={targetRole}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setTargetRole(event.target.value);
                setFocused(true);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Dream role or company"
            />
            {targetRole && (
              <button
                type="button"
                title="Clear role"
                onClick={() => {
                  setTargetRole("");
                  setFocused(true);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {focused && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                <div className="max-h-56 overflow-y-auto py-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setTargetRole(suggestion);
                        setFocused(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-[#64FFDA]/20"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-300 bg-white">
                        <Search className="h-3.5 w-3.5 text-slate-700" />
                      </span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={generate} disabled={loading} className="rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "Building" : "Build"}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</div>}

      <div className="space-y-4">
        {(roadmap.length ? roadmap : fallbackRoadmap).map((step, index) => (
          <article key={`${step.phase}-${step.title}`} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#64FFDA]/30 text-[#0A192F]">
                {index === roadmap.length - 1 ? <Flag className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-[#00ADB5]">{step.phase} - {step.duration}</div>
                <h3 className="mt-1 text-base font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                  {simpleExplanation(index)}
                </p>
                <ul className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                  {step.items.slice(0, 4).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ADB5]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-semibold text-slate-700">{step.outcome}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const fallbackRoadmap: RoadmapStep[] = [
  {
    phase: "Step 1",
    title: "Choose a target role",
    duration: "Today",
    items: ["Select your dream role", "Add your strongest skills", "Upload your resume"],
    outcome: "Your roadmap becomes personalized.",
  },
];

const simpleExplanation = (index: number) => {
  const text = [
    "Start with the basic skills employers expect for this role. Do not try to learn everything at once.",
    "Create proof of your ability: a project, portfolio, certificate, case study, or sample work.",
    "Prepare your resume and practice common interview questions for this job.",
  ];
  return text[index] || "Apply to matching jobs, track responses, and improve your profile after feedback.";
};

export default RoadmapTimeline;
