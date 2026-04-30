import { trendingJobs } from "@/data/jobs";
import { TrendingUp } from "lucide-react";

const TrendingJobs = () => {
  return (
    <section className="py-16 gradient-soft">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <TrendingUp className="h-4 w-4" /> Hot right now
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">Top Trending Jobs</h2>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x">
          {trendingJobs.map((j, i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-72 rounded-2xl gradient-card border border-border/60 p-6 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-smooth cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">
                  {j.icon}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                  {j.growth}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-1">{j.title}</h3>
              <p className="text-sm text-muted-foreground">{j.company}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingJobs;
