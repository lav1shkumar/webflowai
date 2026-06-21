export interface Template {
  id: string;
  name: string;
  description: string;
  category: "Starter" | "AI" | "Business" | "Commerce" | "Internal";
  /** Tailwind gradient used for the card art. */
  gradient: string;
  icon: string; // lucide icon name
  tags: string[];
  /** Seed prompt fed to the generation pipeline. */
  prompt: string;
  popular?: boolean;
}

export const templates: Template[] = [
  {
    id: "saas-starter",
    name: "SaaS Starter",
    description:
      "Auth, billing, dashboard, and marketing pages wired together. The fastest way to a paid product.",
    category: "Starter",
    gradient: "from-indigo-500 to-blue-600",
    icon: "Rocket",
    tags: ["Auth", "Billing", "Dashboard"],
    prompt:
      "Build a SaaS starter with authentication, subscription billing, a dashboard, and a marketing landing page.",
    popular: true,
  },
  {
    id: "ai-app",
    name: "AI App",
    description:
      "Streaming chat UI, tool calling, and a usage-metered backend ready for your model of choice.",
    category: "AI",
    gradient: "from-sky-500 to-indigo-600",
    icon: "Sparkles",
    tags: ["Streaming", "RAG", "Credits"],
    prompt:
      "Build an AI application with a streaming chat interface, document upload, and credit-based usage metering.",
    popular: true,
  },
  {
    id: "crm",
    name: "CRM",
    description:
      "Contacts, pipelines, and activity timelines with a polished kanban board and filters.",
    category: "Business",
    gradient: "from-emerald-600 to-teal-700",
    icon: "Users",
    tags: ["Pipeline", "Kanban", "Contacts"],
    prompt:
      "Build a CRM with contacts, deal pipelines, a kanban board, and activity timelines.",
  },
  {
    id: "dashboard",
    name: "Analytics Dashboard",
    description:
      "Charts, KPIs, and data tables with filtering, ready to plug into your warehouse.",
    category: "Business",
    gradient: "from-blue-600 to-cyan-700",
    icon: "BarChart3",
    tags: ["Charts", "KPIs", "Tables"],
    prompt:
      "Build an analytics dashboard with KPI cards, charts, and filterable data tables.",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description:
      "Storefront, cart, and checkout with product management and order tracking.",
    category: "Commerce",
    gradient: "from-amber-600 to-orange-700",
    icon: "ShoppingBag",
    tags: ["Storefront", "Cart", "Checkout"],
    prompt:
      "Build an e-commerce store with a product catalog, shopping cart, and checkout flow.",
  },
  {
    id: "landing-page",
    name: "Landing Page",
    description:
      "A high-converting marketing page with hero, features, pricing, and CTA sections.",
    category: "Starter",
    gradient: "from-rose-600 to-orange-700",
    icon: "LayoutTemplate",
    tags: ["Marketing", "Hero", "Pricing"],
    prompt:
      "Build a high-converting landing page with a hero, features, testimonials, pricing, and a call to action.",
  },
  {
    id: "internal-tool",
    name: "Internal Tool",
    description:
      "Admin CRUD, role-based access, and audit logs for operations teams.",
    category: "Internal",
    gradient: "from-slate-600 to-zinc-700",
    icon: "Wrench",
    tags: ["Admin", "RBAC", "Audit"],
    prompt:
      "Build an internal admin tool with CRUD management, role-based access control, and audit logs.",
  },
];

export function getTemplate(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
