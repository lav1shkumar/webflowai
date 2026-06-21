/** Global, environment-independent product configuration. */
export const siteConfig = {
  name: "WebFlowAI",
  tagline: "Build Full-Stack SaaS Apps With AI",
  description:
    "Turn ideas into production-ready applications using AI, WebContainers, and a conversational development workflow.",
  url: "https://webflowai.dev",
  links: {
    twitter: "https://twitter.com/webflowai",
    github: "https://github.com/webflowai",
    docs: "/docs",
  },
} as const;

export const marketingNav = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

/** Example prompts surfaced in the hero + dashboard quick-start. */
export const examplePrompts = [
  "Build a CRM for dentists",
  "Build an AI PDF summarizer",
  "Build an expense tracker",
  "Build a fitness coaching platform",
  "Build a SaaS for managing gym memberships",
] as const;

export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  projects: "/projects",
  templates: "/templates",
  settings: "/settings",
  billing: "/settings/billing",
  workspace: (id: string) => `/workspace/${id}`,
} as const;
