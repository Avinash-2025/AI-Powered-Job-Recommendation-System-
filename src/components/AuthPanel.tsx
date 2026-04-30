import { useState } from "react";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { apiPost, User } from "@/lib/api";

interface AuthResponse {
  token: string;
  user: User;
}

interface Props {
  onAuth: (token: string, user: User) => void;
}

const AuthPanel = ({ onAuth }: Props) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("Demo User");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("secret123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await apiPost<AuthResponse>(mode === "login" ? "/login" : "/register", {
        name,
        email,
        password,
      });
      onAuth(response.token, response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-b bg-white">
      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <Lock className="h-4 w-4" />
            SQLite user system
          </div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-normal md:text-4xl">
            AI-Powered Job Recommendation System with Career Chatbot
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Create a profile, upload a resume, and get ML-ranked jobs with skill-gap guidance.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 flex rounded-md border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium ${mode === "login" ? "bg-white shadow-sm" : ""}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded px-3 py-2 text-sm font-medium ${mode === "register" ? "bg-white shadow-sm" : ""}`}
            >
              Register
            </button>
          </div>

          {mode === "register" && (
            <label className="mb-3 block text-sm font-medium">
              Name
              <input className="mt-1 w-full rounded-md border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <label className="mb-3 block text-sm font-medium">
            Email
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="mb-4 block text-sm font-medium">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Working..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default AuthPanel;
