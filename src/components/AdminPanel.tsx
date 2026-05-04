import { useEffect, useState } from "react";
import { Briefcase, ClipboardList, Edit3, ListPlus, LogOut, Plus, Sparkles, Trash2 } from "lucide-react";

interface AdminJob {
  id?: number;
  title: string;
  company: string;
  skills: string;
  experience: string;
  salary: string;
  location: string;
  description: string;
  job_type: string;
}

const emptyJob: AdminJob = { title: "", company: "", skills: "", experience: "", salary: "", location: "", description: "", job_type: "Full-time" };
const skillLibrary = ["Python", "SQL", "Excel", "Power BI", "Machine Learning", "React", "Node.js", "AWS", "Java", "Communication", "Digital Marketing", "Sales", "HR", "Accounting", "Customer Support", "Content Writing"];

const AdminPanel = () => {
  const [token, setToken] = useState(() => localStorage.getItem("job-ai-admin-token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [form, setForm] = useState<AdminJob>(emptyJob);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminView, setAdminView] = useState<"dashboard" | "add" | "jobs" | "skills">("dashboard");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadJobs = async () => {
    if (!token) return;
    const response = await fetch("/api/admin/jobs", { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load jobs.");
    setJobs(data.jobs || []);
  };

  useEffect(() => {
    void loadJobs().catch(() => setToken(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Admin login failed.");
      localStorage.setItem("job-ai-admin-token", data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };

  const saveJob = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(editingId ? `/api/admin/jobs/${editingId}` : "/api/admin/jobs", {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save job.");
      setForm(emptyJob);
      setEditingId(null);
      setStatus(editingId ? "Job updated in the recommendation dataset." : "Job added to the recommendation dataset.");
      setAdminView("jobs");
      await loadJobs();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save job.");
    } finally {
      setLoading(false);
    }
  };

  const removeJob = async (jobId: number) => {
    const response = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE", headers });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Could not delete job.");
      return;
    }
    setStatus("Job deleted.");
    await loadJobs();
  };

  const logoutAdmin = () => {
    localStorage.removeItem("job-ai-admin-token");
    setToken("");
    setJobs([]);
    setForm(emptyJob);
    setEditingId(null);
    setAdminView("dashboard");
  };

  const editJob = (job: AdminJob) => {
    setEditingId(job.id || null);
    setForm(job);
    setAdminView("add");
  };

  const addSkillToForm = (skill: string) => {
    const current = form.skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (current.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setForm({ ...form, skills: [...current, skill].join(", ") });
  };

  if (!token) {
    return (
      <section>
        <form onSubmit={login} className="grid gap-4">
          <label className="text-sm font-bold text-slate-700">
            Username
            <div className="mt-2 flex h-12 items-center rounded-md border px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <input className="min-w-0 flex-1 text-base outline-none" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter admin username" autoComplete="username" />
            </div>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Password
            <div className="mt-2 flex h-12 items-center rounded-md border px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <input className="min-w-0 flex-1 text-base outline-none" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" type="password" autoComplete="current-password" />
            </div>
          </label>
          <button className="mt-2 flex h-14 w-full items-center justify-center rounded-md bg-primary text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/95 disabled:opacity-60" disabled={loading || !username.trim() || !password.trim()}>
            {loading ? "Checking..." : "Login to Admin Account"}
          </button>
        </form>
        {status && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{status}</div>}
      </section>
    );
  }

  const uniqueSkills = new Set(jobs.flatMap((job) => job.skills.split(",").map((skill) => skill.trim()).filter(Boolean)));
  const showForm = adminView === "dashboard" || adminView === "add";
  const showJobs = adminView === "dashboard" || adminView === "jobs";
  const showSkills = adminView === "dashboard" || adminView === "skills";

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[radial-gradient(circle_at_top_left,#d9fff4_0,#f8fbff_36%,#eef3f8_100%)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/40 bg-[#0A192F]/95 px-5 py-6 text-white shadow-2xl lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#64FFDA] text-[#0A192F]">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight">JobFinder</div>
            <div className="text-xs font-medium text-white/60">Admin account</div>
          </div>
        </div>

        <nav className="space-y-2">
          {[
            { label: "Dashboard", value: "dashboard", icon: Briefcase },
            { label: editingId ? "Edit Job" : "Add Job", value: "add", icon: ListPlus },
            { label: "All Jobs", value: "jobs", icon: ClipboardList },
            { label: "Job Skills", value: "skills", icon: Sparkles },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setAdminView(item.value as typeof adminView)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                adminView === item.value ? "bg-[#64FFDA] text-[#0A192F]" : "text-white/72 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={logoutAdmin}
          className="mt-auto flex w-full items-center gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/20 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Admin Logout
        </button>
      </aside>

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#0A192F]">Admin Dashboard</h1>
              <p className="text-sm font-medium text-slate-500">Manage jobs, job skills, and recommendation data.</p>
            </div>
            <button type="button" onClick={logoutAdmin} className="rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-black text-red-600 shadow-sm lg:hidden">
              Admin Logout
            </button>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <AdminStat label="Jobs" value={jobs.length} helper="Active listings" />
            <AdminStat label="Skills" value={uniqueSkills.size} helper="Used in jobs" />
            <AdminStat label="Mode" value="CRUD" helper="Add, edit, delete" />
          </section>

          {status && <div className="rounded-lg bg-[#64FFDA]/20 px-3 py-2 text-sm font-bold text-[#0A192F]">{status}</div>}

          {showForm && (
            <section className="rounded-xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">{editingId ? "Edit Job" : "Add Job"}</h2>
                  <p className="text-sm text-slate-500">Changes update recommendations immediately.</p>
                </div>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm(emptyJob); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                    New Job
                  </button>
                )}
              </div>
              <form onSubmit={saveJob} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                  <Field label="Company" value={form.company} onChange={(value) => setForm({ ...form, company: value })} />
                  <Field label="Experience" value={form.experience} onChange={(value) => setForm({ ...form, experience: value })} />
                  <Field label="Job Type" value={form.job_type} onChange={(value) => setForm({ ...form, job_type: value })} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Skills" value={form.skills} onChange={(value) => setForm({ ...form, skills: value })} />
                  <Field label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {skillLibrary.map((skill) => (
                    <button key={skill} type="button" onClick={() => addSkillToForm(skill)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-[#00ADB5] hover:text-[#007a80]">
                      + {skill}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                  <Field label="Salary" value={form.salary} onChange={(value) => setForm({ ...form, salary: value })} />
                  <Field label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                </div>
                <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#00ADB5] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60" disabled={loading}>
                  <Plus className="h-4 w-4" /> {editingId ? "Update Job" : "Add Job"}
                </button>
              </form>
            </section>
          )}

          {showSkills && (
            <section className="rounded-xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <h2 className="text-xl font-bold text-slate-950">Job Skills</h2>
              <p className="text-sm text-slate-500">Click a skill to add it to the job form.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skillLibrary.map((skill) => (
                  <button key={skill} type="button" onClick={() => { addSkillToForm(skill); setAdminView("add"); }} className="rounded-full bg-[#64FFDA]/25 px-4 py-2 text-sm font-black text-[#0A192F]">
                    {skill}
                  </button>
                ))}
              </div>
            </section>
          )}

          {showJobs && (
            <section className="rounded-xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">All Jobs</h2>
                  <p className="text-sm text-slate-500">Edit or delete listings from the recommendation database.</p>
                </div>
                <button type="button" onClick={() => { setForm(emptyJob); setEditingId(null); setAdminView("add"); }} className="rounded-lg bg-[#0A192F] px-4 py-2 text-sm font-black text-white">
                  Add Job
                </button>
              </div>
              <div className="space-y-3">
                {jobs.map((job) => (
                  <article key={job.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-black text-slate-950">{job.title}</h3>
                      <p className="text-sm font-semibold text-slate-500">{job.company} | {job.location || "Any"} | {job.job_type}</p>
                      <p className="mt-2 text-sm font-medium text-slate-600">{job.skills}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editJob(job)} className="rounded-lg border border-slate-200 p-2 text-slate-600"><Edit3 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => job.id && void removeJob(job.id)} className="rounded-lg border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </article>
                ))}
                {!jobs.length && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">No jobs yet. Add your first job listing.</div>}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="text-sm font-bold text-slate-700">
    {label}
    <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const AdminStat = ({ label, value, helper }: { label: string; value: number | string; helper: string }) => (
  <article className="rounded-xl border border-white/60 bg-white/85 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
    <div className="text-2xl font-black text-[#0A192F]">{value}</div>
    <div className="text-sm font-bold text-slate-600">{label}</div>
    <div className="mt-3 text-xs font-bold text-[#00ADB5]">{helper}</div>
  </article>
);

export default AdminPanel;
