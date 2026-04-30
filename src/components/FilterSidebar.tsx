import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export interface Filters {
  types: string[];
  salary: number;
  experience: string[];
}

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
}

const FilterSection = ({ title, children, defaultOpen = true }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border/60 pb-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 font-semibold text-sm hover:text-primary transition-smooth">
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-3 animate-fade-in">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const FilterSidebar = ({ filters, setFilters }: Props) => {
  const toggle = (key: "types" | "experience", value: string) => {
    const arr = filters[key];
    setFilters({
      ...filters,
      [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    });
  };

  return (
    <aside className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft sticky top-24 h-fit">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/60">
        <SlidersHorizontal className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Filters</h3>
      </div>

      <FilterSection title="Job Type">
        {["Full-time", "Part-time", "Remote"].map((t) => (
          <div key={t} className="flex items-center space-x-2">
            <Checkbox
              id={`type-${t}`}
              checked={filters.types.includes(t)}
              onCheckedChange={() => toggle("types", t)}
            />
            <Label htmlFor={`type-${t}`} className="text-sm font-normal cursor-pointer">
              {t}
            </Label>
          </div>
        ))}
      </FilterSection>

      <FilterSection title="Salary Range">
        <div className="px-1">
          <Slider
            value={[filters.salary]}
            onValueChange={([v]) => setFilters({ ...filters, salary: v })}
            max={250}
            step={10}
            className="mt-2"
          />
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>$0k</span>
            <span className="font-semibold text-primary">${filters.salary}k+</span>
            <span>$250k</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Experience Level">
        {["Fresher", "1-3 years", "3-5 years", "5+ years"].map((t) => (
          <div key={t} className="flex items-center space-x-2">
            <Checkbox
              id={`exp-${t}`}
              checked={filters.experience.includes(t)}
              onCheckedChange={() => toggle("experience", t)}
            />
            <Label htmlFor={`exp-${t}`} className="text-sm font-normal cursor-pointer">
              {t}
            </Label>
          </div>
        ))}
      </FilterSection>
    </aside>
  );
};

export default FilterSidebar;
