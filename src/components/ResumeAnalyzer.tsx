import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload, X } from "lucide-react";
import { JobRecommendation, RoadmapStep, SkillGap, uploadResume } from "@/lib/api";

interface Props {
  token: string | null;
  experience: string;
  education: string;
  location: string;
  onAnalysis: (jobs: JobRecommendation[], gap: SkillGap, skills: string[], roadmap: RoadmapStep[]) => void;
  onRecommend: (skills: string[]) => void;
}

const ResumeAnalyzer = ({ token, experience, education, location, onAnalysis, onRecommend }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => (p < 95 ? p + 1 : p));
    }, 100); // ~9.5 seconds expected duration
    return () => clearInterval(interval);
  }, [loading]);

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setError("Analysis cancelled.");
    }
  };

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    const name = picked.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".txt")) {
      setError("Only PDF and TXT files are supported. Please choose a valid resume file.");
      return;
    }
    setFile(picked);
    setError("");
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) pickFile(dropped);
  }, []);

  const submit = async () => {
    if (!file) {
      setError("Please select a resume file first. Click the upload area or drag and drop a PDF/TXT file.");
      return;
    }
    setLoading(true);
    setError("");
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("experience", experience);
      form.append("education", education);
      form.append("location", location);
      const response = await uploadResume(form, token, abortController.signal);
      setSkills(response.resume.skills);
      onAnalysis(response.recommendations, response.skill_gap, response.resume.skills, response.roadmap);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Resume analysis failed. Please try again.");
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setSkills([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="rounded-xl border border-dashed border-[#00ADB5]/40 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
      <div className="grid gap-5 md:grid-cols-[160px_1fr_190px] md:items-center">
        <label
          className={`group grid h-36 cursor-pointer place-items-center rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-[#00ADB5] bg-[#64FFDA]/30 scale-105"
              : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-[#00ADB5]/30 bg-[#64FFDA]/10 hover:border-[#00ADB5]/60 hover:bg-[#64FFDA]/20"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,text/plain,.pdf,.txt"
            className="sr-only"
            onChange={(event) => pickFile(event.target.files?.[0] || null)}
          />
          <div className="text-center">
            {file ? (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <div className="mt-1 text-xs font-bold text-emerald-700">File ready</div>
              </>
            ) : (
              <>
                <FileUp className={`mx-auto h-12 w-12 ${dragOver ? "text-[#007a80] animate-bounce" : "text-[#00ADB5]"}`} />
                <div className="mt-1 text-xs font-bold text-slate-500">
                  {dragOver ? "Drop here" : "Click or drag"}
                </div>
              </>
            )}
          </div>
        </label>

        <div>
          <h2 className="text-xl font-black text-slate-950">Upload Your Resume</h2>
          <p className="mt-2 text-sm font-medium text-slate-600">Extract resume skills and recommend jobs without changing your profile.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              PDF or TXT supported
            </span>
            {file && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {file.name}
                <button type="button" onClick={(e) => { e.preventDefault(); clearFile(); }} className="rounded-full p-0.5 hover:bg-emerald-200">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black text-white shadow-sm transition ${
              file
                ? "bg-[#00ADB5] hover:bg-[#009da5] active:scale-95"
                : "bg-[#0A192F] hover:bg-[#0d2240]"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? `Analyzing... ${progress}%` : file ? "Analyze Resume" : "Select File First"}
          </button>
          {loading && (
            <button
              type="button"
              onClick={cancelUpload}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-black bg-red-500 text-white shadow-sm transition hover:bg-red-600 active:scale-95"
            >
              <X className="h-4 w-4" />
              Cancel Analysis
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="mb-3 text-sm font-black text-slate-900">✅ Extracted Skills ({skills.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span key={skill} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm border border-emerald-200">
                {skill}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onRecommend(skills)}
              className="rounded-lg bg-[#00ADB5] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#009da5] active:scale-95"
            >
              Recommend from Resume Skills
            </button>
            <button
              type="button"
              onClick={clearFile}
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default ResumeAnalyzer;
