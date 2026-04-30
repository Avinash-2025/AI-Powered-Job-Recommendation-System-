import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { apiPost, ChatResponse } from "@/lib/api";

interface Props {
  token: string | null;
}

interface Message {
  role: "user" | "bot";
  text: string;
}

const CareerChatbot = ({ token }: Props) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hi, ask me for job suggestions, missing skills, or resume guidance." },
  ]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const response = await apiPost<ChatResponse>("/chat", { message: text }, token);
      const skillText = response.suggested_skills.length ? `\nLearn next: ${response.suggested_skills.slice(0, 5).join(", ")}` : "";
      const courseText = response.suggested_courses?.length ? `\nCourses: ${response.suggested_courses.slice(0, 3).join("; ")}` : "";
      setMessages((current) => [...current, { role: "bot", text: `${response.reply}${skillText}${courseText}` }]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: "bot", text: err instanceof Error ? err.message : "Chat failed" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section className="mb-3 flex h-[520px] w-[min(380px,calc(100vw-40px))] flex-col rounded-lg border bg-white shadow-lg">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5 text-primary" />
              Career Chatbot
            </div>
            <button type="button" title="Close chatbot" onClick={() => setOpen(false)} className="rounded-md border p-1.5">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <input
              className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="Ask about careers..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button type="submit" disabled={loading} title="Send message" className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-60">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        title="Open career chatbot"
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
};

export default CareerChatbot;
