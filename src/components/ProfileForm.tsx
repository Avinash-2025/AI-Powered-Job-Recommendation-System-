import { BrainCircuit, Briefcase, GraduationCap, MapPin } from "lucide-react";
import { Profile } from "@/lib/api";

interface Props {
  profile: Profile;
  loading: boolean;
  onChange: (profile: Profile) => void;
  onSave: () => void;
  onRecommend: () => void;
}

const experienceOptions = ["Fresher", "1-3 years", "3-5 years", "5+ years"];
const educationOptions = ["Bachelor", "Master", "PhD"];

const ProfileForm = ({ profile, loading, onChange, onSave, onRecommend }: Props) => {
  const update = (key: keyof Profile, value: string) => onChange({ ...profile, [key]: value });

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Candidate Profile</h2>
          <p className="text-sm text-muted-foreground">Skills, education, experience, and preferred location feed the ML model.</p>
        </div>
        <BrainCircuit className="h-6 w-6 text-primary" />
      </div>

      <label className="mb-4 block text-sm font-medium">
        Skills
        <textarea
          className="mt-1 min-h-28 w-full resize-none rounded-md border px-3 py-2"
          placeholder="Python, SQL, machine learning, React, AWS..."
          value={profile.skills}
          onChange={(event) => update("skills", event.target.value)}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">
          <span className="mb-1 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Education
          </span>
          <select className="w-full rounded-md border px-3 py-2" value={profile.education} onChange={(e) => update("education", e.target.value)}>
            <option value="">Select</option>
            {educationOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          <span className="mb-1 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Experience
          </span>
          <select className="w-full rounded-md border px-3 py-2" value={profile.experience} onChange={(e) => update("experience", e.target.value)}>
            <option value="">Select</option>
            {experienceOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          <span className="mb-1 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </span>
          <input
            className="w-full rounded-md border px-3 py-2"
            placeholder="Remote, Bangalore, New York"
            value={profile.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onRecommend} disabled={loading || !profile.skills.trim()} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? "Recommending..." : "Get Top 5 Jobs"}
        </button>
        <button type="button" onClick={onSave} disabled={loading} className="rounded-md border px-4 py-2 font-semibold">
          Save Profile
        </button>
      </div>
    </section>
  );
};

export default ProfileForm;
