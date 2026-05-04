import { useState } from "react";
import { Briefcase, Check, FileText, Lock, Mail, MessageCircle, Search, ShieldCheck, UserPlus } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";
import { apiPost, User } from "@/lib/api";

interface AuthResponse {
  token: string;
  user: User;
}

interface Props {
  onAuth: (token: string, user: User) => void;
}

const AuthPanel = ({ onAuth }: Props) => {
  const [mode, setMode] = useState<"login" | "register" | "admin">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lastUserEmail, setLastUserEmail] = useState(() => localStorage.getItem("job-ai-last-email") || "");
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (nextMode: "login" | "register" | "admin") => {
    if (nextMode === "admin") {
      localStorage.removeItem("job-ai-admin-token");
    }
    setMode(nextMode);
    setError("");
    setSuccess("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const loginName = email.trim();
      if (mode === "login" && loginName.toLowerCase() === "admin") {
        const adminResponse = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: loginName, password }),
        });
        const adminData = await adminResponse.json();
        if (!adminResponse.ok) throw new Error(adminData.error || "Admin login failed.");
        localStorage.setItem("job-ai-admin-token", adminData.token);
        setPassword("");
        setMode("admin");
        return;
      }

      const response = await apiPost<AuthResponse>(mode === "login" ? "/login" : "/register", {
        name,
        email,
        password,
      });

      if (mode === "register") {
        localStorage.setItem("job-ai-last-email", email.trim());
        setLastUserEmail(email.trim());
        onAuth(response.token, response.user);
      } else {
        localStorage.setItem("job-ai-last-email", email.trim());
        setLastUserEmail(email.trim());
        onAuth(response.token, response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative overflow-hidden bg-[#061945] px-8 py-10 text-white md:px-16 lg:px-20">
          <div className="absolute -right-36 -top-32 h-96 w-96 rounded-full bg-primary/10" />
          <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-primary/10" />

          <div className="relative z-10 flex min-h-full flex-col justify-between">
            <div>
              <div className="mb-20 flex items-center gap-3 text-2xl font-bold">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>

              <h1 className="max-w-xl text-4xl font-bold leading-tight md:text-5xl">
                Discover opportunities that match your skills
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100/80">
                AI-powered job recommendations, resume analysis, and career guidance in one place.
              </p>

              <div className="mt-10 space-y-7">
                <Feature icon={<Search className="h-6 w-6" />} title="Smart Job Matching" text="Find roles that fit your skills and goals." />
                <Feature icon={<FileText className="h-6 w-6" />} title="Resume Insights" text="Get skill feedback from your resume." />
                <Feature icon={<MessageCircle className="h-6 w-6" />} title="Career Guidance" text="Ask questions and get helpful advice." />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          {mode === "admin" ? (
            <div className="w-full max-w-md">
              <div className="mb-7 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h2 className="text-3xl font-bold text-[#061945]">Admin Login</h2>
                <p className="mt-2 text-muted-foreground">Sign in to manage job listings</p>
              </div>
              <AdminPanel />
              <div className="mt-7 text-center">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-sm font-semibold text-primary"
                >
                  Back to user login
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                {mode === "login" ? <Lock className="h-8 w-8" /> : <UserPlus className="h-8 w-8" />}
              </div>
              <h2 className="text-3xl font-bold text-[#061945]">{mode === "login" ? "Welcome back" : "Create account"}</h2>
              <p className="mt-2 text-muted-foreground">{mode === "login" ? "Sign in to your account to continue" : "Register your account first"}</p>
            </div>

            {mode === "register" && (
              <label className="mb-4 block text-sm font-medium text-[#061945]">
                Name
                <input
                  className="mt-2 h-12 w-full rounded-md border px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}

            <label className="mb-4 block text-sm font-medium text-[#061945]">
              {mode === "login" ? "Email address or admin username" : "Email address"}
              <div className="relative mt-2">
                <div className="flex h-12 items-center gap-3 rounded-md border px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <input
                    className="min-w-0 flex-1 text-base outline-none"
                    placeholder={mode === "login" ? "Enter your email or admin" : "Enter your email"}
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailFocused(true);
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => window.setTimeout(() => setEmailFocused(false), 120)}
                  />
                </div>
                {mode === "login" && emailFocused && lastUserEmail && email.trim().toLowerCase() !== "admin" && lastUserEmail.toLowerCase().includes(email.trim().toLowerCase()) && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setEmail(lastUserEmail);
                        setEmailFocused(false);
                      }}
                      className="flex w-full flex-col px-5 py-3 text-left hover:bg-[#64FFDA]/20"
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">Already used account</span>
                      <span className="mt-1 text-sm font-bold text-[#061945]">{lastUserEmail}</span>
                    </button>
                  </div>
                )}
              </div>
            </label>

            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-[#061945]" htmlFor="auth-password">
                Password
              </label>
              {mode === "login" && <button type="button" className="text-sm font-medium text-primary">Forgot password?</button>}
            </div>

            <div className="mb-4 flex h-12 items-center gap-3 rounded-md border px-4 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <input
                id="auth-password"
                type="password"
                className="min-w-0 flex-1 text-base outline-none"
                placeholder="Enter your password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "login" && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => switchMode("admin")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#061945] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin account
                </button>
              </div>
            )}

            {success && <div className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{success}</div>}
            {error && <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center rounded-md bg-primary text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/95 disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            <p className="mt-7 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="font-semibold text-primary"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </form>
          )}
        </section>
      </div>
    </main>
  );
};

const Feature = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="flex gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
      {icon}
    </div>
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-blue-100/75">{text}</p>
    </div>
  </div>
);

export default AuthPanel;
