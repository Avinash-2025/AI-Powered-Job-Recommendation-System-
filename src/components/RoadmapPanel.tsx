import { Route } from "lucide-react";
import { RoadmapStep } from "@/lib/api";

interface Props {
  roadmap: RoadmapStep[];
}

const RoadmapPanel = ({ roadmap }: Props) => {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Career Roadmap</h2>
          <p className="text-sm text-muted-foreground">Generated from missing skills across real job postings.</p>
        </div>
        <Route className="h-6 w-6 text-primary" />
      </div>

      {roadmap.length ? (
        <div className="space-y-4">
          {roadmap.map((step) => (
            <div key={step.phase} className="rounded-md border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-primary">{step.phase}</div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{step.duration}</span>
              </div>
              <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {step.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="rounded-md bg-muted px-3 py-2 text-sm">{step.outcome}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Run recommendations to generate a role-specific roadmap.
        </div>
      )}
    </section>
  );
};

export default RoadmapPanel;
