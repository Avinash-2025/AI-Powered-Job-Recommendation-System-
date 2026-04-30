import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, Users } from "lucide-react";

const Hero = () => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="home" className="relative overflow-hidden gradient-soft">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="container relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6 shadow-soft">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Job Matching
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Find Your <span className="text-gradient">Dream Job</span>
            <br />
            Instantly
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Get personalized job recommendations based on your skills, experience, and career goals — powered by intelligent matching.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => scrollTo("recommend")}
              className="gradient-hero shadow-elegant hover:shadow-glow transition-smooth border-0 h-12 px-8 text-base group"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo("how")}
              className="h-12 px-8 text-base bg-background/60 backdrop-blur"
            >
              How It Works
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Users, value: "50K+", label: "Active Users" },
              { icon: TrendingUp, value: "10K+", label: "Jobs Matched" },
              { icon: Sparkles, value: "98%", label: "Accuracy" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl bg-card/60 backdrop-blur border border-border/60 p-4 shadow-soft hover:shadow-elegant transition-smooth">
                <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
