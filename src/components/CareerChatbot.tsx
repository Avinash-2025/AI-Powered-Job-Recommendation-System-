import { useState } from "react";
import { Bot, Briefcase, Send, Sparkles, X } from "lucide-react";
import { apiPost, ChatResponse, JobRecommendation, RoadmapStep } from "@/lib/api";

interface Props {
  token: string | null;
}

interface Message {
  role: "user" | "bot";
  text: string;
  jobs?: JobRecommendation[];
  skills?: string[];
  roadmap?: RoadmapStep[];
  provider?: "gemini" | "local";
}

const quickPrompts = [
  "Find jobs for Python and SQL",
  "Suggest non technical jobs",
  "What skills should I learn?",
  "Create a roadmap for Data Analyst",
];

const CareerChatbot = ({ token }: Props) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Tell me what you need. I can find jobs, suggest skills, explain roadmap steps, or help improve your resume.",
    },
  ]);

  const sendText = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setInput("");
    setLoading(true);
    try {
      const response = await apiPost<ChatResponse>("/chat", { message: clean }, token);
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: response.reply,
          jobs: response.jobs,
          skills: response.suggested_skills,
          roadmap: response.roadmap,
          provider: response.provider,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "bot", text: err instanceof Error ? err.message : "I could not complete that request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    void sendText(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section className="mb-3 flex h-[560px] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-[#0A192F] px-4 py-3 text-white">
            <div>
              <div className="flex items-center gap-2 font-black">
                <Bot className="h-5 w-5 text-[#64FFDA]" />
                Career Assistant
              </div>
              <div className="text-xs font-medium text-white/60">Ask for jobs, skills, roadmap, or resume help</div>
            </div>
            <button type="button" title="Close chatbot" onClick={() => setOpen(false)} className="rounded-lg border border-white/10 p-1.5">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="border-b bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendText(prompt)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#00ADB5] hover:text-[#007a80]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-[#0A192F] text-white" : "bg-slate-100 text-slate-800"}`}>
                  <div className="whitespace-pre-line font-medium">{message.text}</div>

                  {message.jobs?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.jobs.slice(0, 3).map((job) => (
                        <div key={job.id} className="rounded-xl bg-white p-3 shadow-sm">
                          <div className="flex items-start gap-2">
                            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[#00ADB5]" />
                            <div>
                              <div className="font-black text-[#0A192F]">{job.title}</div>
                              <div className="text-xs font-semibold text-slate-500">{job.company} • {job.match || 0}% match</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {message.skills?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.skills.slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full bg-[#64FFDA]/30 px-2.5 py-1 text-xs font-black text-[#0A192F]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {message.roadmap?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.roadmap.slice(0, 3).map((step) => (
                        <div key={`${step.phase}-${step.title}`} className="rounded-xl bg-white p-3 text-xs shadow-sm">
                          <div className="font-black text-[#0A192F]">{step.phase}: {step.title}</div>
                          <div className="mt-1 font-medium text-slate-500">{step.items.slice(0, 2).join(", ")}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-500">Working on it...</div>
              </div>
            )}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <input
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none focus:border-[#00ADB5]"
              placeholder="Tell me what to do..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={loading} title="Send message" className="rounded-xl bg-[#00ADB5] p-2.5 text-white disabled:opacity-60">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A192F] text-white shadow-xl transition hover:-translate-y-0.5"
        title="Open career chatbot"
      >
        <Sparkles className="h-6 w-6 text-[#64FFDA]" />
      </button>
    </div>
  );
};

export default CareerChatbot;
