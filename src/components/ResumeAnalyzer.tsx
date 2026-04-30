import { useState } from "react";
import { FileSearch, Upload } from "lucide-react";
import { JobRecommendation, RoadmapStep, SkillGap, uploadResume } from "@/lib/api";

interface Props {
  token: string | null;
  experience: string;
  education: string;
  location: string;
  onAnalysis: (jobs: JobRecommendation[], gap: SkillGap, skills: string[], roadmap: RoadmapStep[]) => void;
}

const ResumeAnalyzer = ({ token, experience, education, location, onAnalysis }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("experience", experience);
      form.append("education", education);
      form.append("location", location);
      const response = await uploadResume(form, token);
      setSkills(response.resume.skills);
      onAnalysis(response.recommendations, response.skill_gap, response.resume.skills, response.roadmap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Resume Analyzer</h2>
          <p className="text-sm text-muted-foreground">Upload a PDF to extract skills and compare against jobs.</p>
        </div>
        <FileSearch className="h-6 w-6 text-primary" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="file"
          accept="application/pdf,text/plain,.pdf,.txt"
          className="w-full rounded-md border px-3 py-2 text-sm"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!file || loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {skills.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">Extracted Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 18).map((skill) => (
              <span key={skill} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ResumeAnalyzer;
