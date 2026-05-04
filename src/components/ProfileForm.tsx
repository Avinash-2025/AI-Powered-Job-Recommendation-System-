import { useMemo, useState } from "react";
import { Briefcase, GraduationCap, MapPin, Plus, X } from "lucide-react";
import { Profile } from "@/lib/api";
import { skillSuggestionOptions } from "@/lib/skills";

interface Props {
  profile: Profile;
  loading: boolean;
  onChange: (profile: Profile) => void;
  onSave: () => void;
  onRecommend: () => void;
}

const skillOptions = skillSuggestionOptions;
const experienceOptions = ["Fresher", "1-3 years", "3-5 years", "5+ years"];
const educationOptions = ["Bachelor", "Master", "PhD", "Diploma"];
const locationOptions = ["Others / Anywhere", "Remote", "Bangalore", "Hyderabad", "Chennai", "Pune", "Mumbai", "Delhi", "Noida", "Gurgaon", "New York", "London"];

const toSkills = (value: string) =>
  value
    .split(/[,;\n]+/)
    .map((skill) => skill.trim())
    .filter(isManualSkillTag);

const isManualSkillTag = (skill: string) => {
  const clean = skill.trim();
  if (!clean) return false;
  if (clean.length > 36) return false;
  if (clean.split(/\s+/).length > 4) return false;
  return /[a-z]/i.test(clean);
};

const ProfileForm = ({ profile, loading, onChange, onSave, onRecommend }: Props) => {
  const [customSkill, setCustomSkill] = useState("");
  const skills = toSkills(profile.skills);
  const update = (key: keyof Profile, value: string) => onChange({ ...profile, [key]: value });
  const suggestions = useMemo(() => {
    const query = customSkill.trim().toLowerCase();
    return skillOptions
      .filter((skill) => !skills.some((item) => item.toLowerCase() === skill.toLowerCase()))
      .filter((skill) => !query || skill.toLowerCase().includes(query))
      .slice(0, 10);
  }, [customSkill, skills]);

  const toggleSkill = (skill: string) => {
    const exists = skills.some((item) => item.toLowerCase() === skill.toLowerCase());
    const nextSkills = exists ? skills.filter((item) => item.toLowerCase() !== skill.toLowerCase()) : [...skills, skill];
    update("skills", nextSkills.join(", "));
  };

  const addCustomSkill = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const nextSkills = [...skills, clean].filter((item, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
    update("skills", nextSkills.join(", "));
  };

  return (
    <section className="rounded-xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-950">Profile</h2>
        <p className="text-sm text-slate-500">Keep this simple. Better profile details create better matches.</p>
      </div>

      <div className="grid gap-5">
        <div>
          <div className="mb-2 text-sm font-bold text-slate-700">Skills</div>
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className="inline-flex items-center gap-1 rounded-full bg-[#0A192F] px-3 py-1.5 text-xs font-bold text-white"
              >
                {skill}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
          <div className="mb-3 flex max-h-20 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/60 p-2">
            {suggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => {
                  toggleSkill(skill);
                  setCustomSkill("");
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  skills.some((item) => item.toLowerCase() === skill.toLowerCase())
                    ? "border-[#00ADB5] bg-[#00ADB5]/10 text-[#007a80]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#00ADB5]"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
          <form
            className="mt-4 max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              addCustomSkill(customSkill);
              setCustomSkill("");
            }}
          >
            <div className="flex gap-2">
              <input
                name="customSkill"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00ADB5]"
                placeholder="Type a skill or job area, e.g. Marketing"
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
              />
              <button type="submit" title="Add skill" className="rounded-lg bg-[#00ADB5] p-2 text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">
            <span className="mb-1 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#00ADB5]" />
              Degree
            </span>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" value={profile.education} onChange={(e) => update("education", e.target.value)}>
              <option value="">Select</option>
              {educationOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-slate-700">
            Branch
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" placeholder="CSE, IT, ECE" value={profile.branch || ""} onChange={(e) => update("branch", e.target.value)} />
          </label>

          <label className="text-sm font-bold text-slate-700">
            University
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" placeholder="University name" value={profile.university || ""} onChange={(e) => update("university", e.target.value)} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            <span className="mb-1 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#00ADB5]" />
              Experience
            </span>
            <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" value={profile.experience} onChange={(e) => update("experience", e.target.value)}>
              <option value="">Select</option>
              {experienceOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-bold text-slate-700">
            <span className="mb-1 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#00ADB5]" />
              Preferred Location
            </span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]"
              placeholder="Others / Anywhere, Remote, Bangalore"
              value={profile.location}
              list="profile-location-options"
              onChange={(e) => update("location", e.target.value)}
            />
            <datalist id="profile-location-options">
              {locationOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">
            Past Roles
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" placeholder="Intern, Developer" value={profile.roles || ""} onChange={(e) => update("roles", e.target.value)} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Certifications
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" placeholder="AWS, Google ML, NPTEL" value={profile.certifications || ""} onChange={(e) => update("certifications", e.target.value)} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Salary Expectation
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-[#00ADB5]" placeholder="6 LPA, $80k" value={profile.salary_expectation || ""} onChange={(e) => update("salary_expectation", e.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onSave} disabled={loading} className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#00ADB5]">
          Save Profile
        </button>
        <button type="button" onClick={onRecommend} disabled={loading} className="rounded-lg bg-[#00ADB5] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#009aa1] disabled:opacity-60">
          {loading ? "Finding..." : "Recommend Jobs"}
        </button>
      </div>
    </section>
  );
};

export default ProfileForm;
