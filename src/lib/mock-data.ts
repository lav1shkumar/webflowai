/**
 * Demo data used to render the dashboard and workspace when the database
 * is not seeded (e.g. public demo mode). Real queries replace these in
 * production via the data-access layer in `src/server/`.
 */

export interface DemoProject {
  id: string;
  name: string;
  description: string;
  status: "READY" | "GENERATING" | "DRAFT" | "ERROR";
  framework: string;
  updatedAt: string; // ISO
  gradient: string;
}

export const demoProjects: DemoProject[] = [
  {
    id: "proj_dental_crm",
    name: "DentalFlow CRM",
    description: "Patient management and appointment scheduling for clinics.",
    status: "READY",
    framework: "next",
    updatedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    gradient: "from-emerald-600 to-teal-700",
  },
  {
    id: "proj_pdf_ai",
    name: "PDF Summarizer",
    description: "AI that ingests PDFs and produces structured summaries.",
    status: "READY",
    framework: "next",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    gradient: "from-sky-500 to-indigo-600",
  },
  {
    id: "proj_expense",
    name: "SpendWise",
    description: "Personal expense tracker with budgets and insights.",
    status: "GENERATING",
    framework: "next",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    gradient: "from-blue-600 to-cyan-700",
  },
  {
    id: "proj_gym",
    name: "GymOS",
    description: "Membership and class management for fitness studios.",
    status: "DRAFT",
    framework: "next",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    gradient: "from-amber-600 to-orange-700",
  },
];

export interface UsagePoint {
  label: string;
  value: number;
}

export const demoUsage = {
  creditsBalance: 142,
  creditsMonthly: 200,
  generationsThisMonth: 38,
  projectsCount: demoProjects.length,
  series: [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 28 },
    { label: "Wed", value: 19 },
    { label: "Thu", value: 41 },
    { label: "Fri", value: 33 },
    { label: "Sat", value: 9 },
    { label: "Sun", value: 16 },
  ] as UsagePoint[],
};

export const demoUser = {
  name: "Alex Founder",
  email: "alex@webflowai.dev",
  plan: "PRO" as const,
  initials: "AF",
};
