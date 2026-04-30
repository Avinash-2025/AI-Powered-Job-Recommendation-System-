import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { JobRecommendation, SkillGap } from "@/lib/api";

interface Props {
  jobs: JobRecommendation[];
  gap: SkillGap | null;
  savedCount: number;
  appliedCount: number;
}

const DashboardAnalytics = ({ jobs, gap, savedCount, appliedCount }: Props) => {
  const scoreData = jobs.map((job) => ({
    name: job.title.length > 18 ? `${job.title.slice(0, 18)}...` : job.title,
    match: job.match || 0,
  }));

  const skillData = [
    { name: "Matched", value: gap?.matched.length || 0, color: "hsl(var(--success))" },
    { name: "Missing", value: gap?.missing.length || 0, color: "hsl(38 92% 50%)" },
  ];

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Skills vs jobs, saved roles, and applied roles.</p>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-md bg-secondary p-3">
          <div className="text-2xl font-bold text-primary">{jobs.length}</div>
          <div className="text-xs text-muted-foreground">top jobs</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="text-2xl font-bold text-primary">{savedCount}</div>
          <div className="text-xs text-muted-foreground">saved</div>
        </div>
        <div className="rounded-md bg-secondary p-3">
          <div className="text-2xl font-bold text-primary">{appliedCount}</div>
          <div className="text-xs text-muted-foreground">applied</div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="h-56 rounded-md border p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis domain={[0, 100]} fontSize={10} />
              <Tooltip />
              <Bar dataKey="match" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-52 rounded-md border p-3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={skillData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={4}>
                {skillData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default DashboardAnalytics;
