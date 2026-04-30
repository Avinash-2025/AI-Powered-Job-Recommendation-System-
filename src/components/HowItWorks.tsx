import { FileText, Brain, Sparkles } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Enter Your Skills",
    desc: "Tell us about your expertise, experience, and where you'd like to work.",
  },
  {
    icon: Brain,
    title: "AI Analyzes Profile",
    desc: "Our intelligent engine evaluates your profile against thousands of opportunities.",
  },
  {
    icon: Sparkles,
    title: "Get Recommendations",
    desc: "Receive a curated list of jobs ranked by match percentage in seconds.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how" className="container py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          How It <span className="text-gradient">Works</span>
        </h2>
        <p className="text-muted-foreground">
          Three simple steps to discover your next career move.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative">
        {steps.map((s, i) => (
          <div
            key={i}
            className="relative rounded-2xl border border-border/60 gradient-card p-8 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-smooth group"
          >
            <div className="absolute -top-4 left-8 h-8 w-8 rounded-full gradient-hero text-primary-foreground font-bold text-sm flex items-center justify-center shadow-soft">
              {i + 1}
            </div>
            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-5 group-hover:scale-110 transition-smooth">
              <s.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
