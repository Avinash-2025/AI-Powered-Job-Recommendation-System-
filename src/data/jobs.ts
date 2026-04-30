export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  match: number;
  description: string;
  type: "Full-time" | "Part-time" | "Remote";
  salary: string;
  experience: string;
  logo: string;
}

export const jobs: Job[] = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    match: 96,
    description: "Build delightful, high-performance interfaces for millions of businesses worldwide using React and TypeScript.",
    type: "Full-time",
    salary: "$140k - $180k",
    experience: "3-5 years",
    logo: "🟣",
  },
  {
    id: 2,
    title: "Full Stack Developer",
    company: "Linear",
    location: "Remote",
    match: 92,
    description: "Help shape the next generation of project management tools. Work with TypeScript, React, and GraphQL.",
    type: "Remote",
    salary: "$120k - $160k",
    experience: "1-3 years",
    logo: "🟦",
  },
  {
    id: 3,
    title: "Machine Learning Engineer",
    company: "OpenAI",
    location: "New York, NY",
    match: 89,
    description: "Apply state-of-the-art ML to solve real-world problems. Strong Python and PyTorch experience required.",
    type: "Full-time",
    salary: "$160k - $220k",
    experience: "3-5 years",
    logo: "⚫",
  },
  {
    id: 4,
    title: "Product Designer",
    company: "Figma",
    location: "Remote",
    match: 85,
    description: "Design intuitive workflows and beautiful interfaces. Collaborate closely with engineering teams.",
    type: "Remote",
    salary: "$110k - $150k",
    experience: "1-3 years",
    logo: "🟧",
  },
  {
    id: 5,
    title: "DevOps Engineer",
    company: "Vercel",
    location: "Austin, TX",
    match: 81,
    description: "Scale infrastructure for the world's fastest frontend cloud. Kubernetes, AWS, and CI/CD experience.",
    type: "Full-time",
    salary: "$130k - $170k",
    experience: "3-5 years",
    logo: "⚫",
  },
  {
    id: 6,
    title: "Junior Web Developer",
    company: "Notion",
    location: "Bangalore, India",
    match: 78,
    description: "Join a fast-paced team building productivity tools loved by millions. Great mentorship and growth.",
    type: "Part-time",
    salary: "$40k - $60k",
    experience: "Fresher",
    logo: "⚪",
  },
];

export const trendingJobs = [
  { title: "AI Engineer", company: "Anthropic", growth: "+45%", icon: "🤖" },
  { title: "Cloud Architect", company: "AWS", growth: "+32%", icon: "☁️" },
  { title: "Data Scientist", company: "Meta", growth: "+28%", icon: "📊" },
  { title: "Mobile Developer", company: "Apple", growth: "+24%", icon: "📱" },
  { title: "Cybersecurity Analyst", company: "CrowdStrike", growth: "+38%", icon: "🛡️" },
  { title: "Blockchain Dev", company: "Coinbase", growth: "+22%", icon: "⛓️" },
];
