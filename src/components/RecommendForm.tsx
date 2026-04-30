import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, MapPin, Briefcase } from "lucide-react";

export interface RecommendPayload {
  skills: string;
  experience: string;
  location: string;
}

interface Props {
  onRecommend: (payload: RecommendPayload) => void;
  loading: boolean;
}

const RecommendForm = ({ onRecommend, loading }: Props) => {
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecommend({ skills, experience, location });
  };

  return (
    <section id="recommend" className="container py-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Tell Us About <span className="text-gradient">Yourself</span>
          </h2>
          <p className="text-muted-foreground">
            Share your skills and preferences — we'll match you with the perfect roles.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-border/60 gradient-card shadow-elegant p-6 md:p-10 animate-scale-in"
        >
          <div className="space-y-6">
            <div>
              <Label htmlFor="skills" className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Your Skills
              </Label>
              <Textarea
                id="skills"
                placeholder="e.g. React, TypeScript, Node.js, Python, UI/UX Design..."
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="min-h-24 resize-none bg-background/60 border-border/80 focus:border-primary transition-smooth"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Experience
                </Label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className="bg-background/60 h-11 border-border/80">
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresher">Fresher</SelectItem>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="5+">5+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location" className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Preferred Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. Remote, San Francisco, Bangalore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-11 bg-background/60 border-border/80 focus:border-primary transition-smooth"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !skills.trim()}
              size="lg"
              className="w-full gradient-hero shadow-soft hover:shadow-glow transition-smooth border-0 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing your profile...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Recommend Jobs
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RecommendForm;
