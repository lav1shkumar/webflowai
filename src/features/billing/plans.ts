export type PlanId = "free" | "pro" | "team";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  /** Price in paise (INR). Annual is per-year. */
  priceMonthly: number;
  priceAnnual: number;
  credits: number;
  highlight?: boolean;
  cta: string;
  features: string[];
  /** Razorpay plan ids per cycle, injected from env in production. */
  razorpayPlanIds?: { monthly?: string; annual?: string };
}

export const plans: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For exploring and prototyping ideas.",
    priceMonthly: 0,
    priceAnnual: 0,
    credits: 200,
    cta: "Start for free",
    features: [
      "200 AI credits / month",
      "Up to 3 projects",
      "In-browser WebContainer runtime",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For builders shipping real products.",
    priceMonthly: 199900,
    priceAnnual: 1990000,
    credits: 3000,
    highlight: true,
    cta: "Upgrade to Pro",
    features: [
      "3,000 AI credits / month",
      "Unlimited projects",
      "Priority generation queue",
      "Custom domains on deploys",
      "Email support",
    ],
  },
  {
    id: "team",
    name: "Team",
    tagline: "For teams building together.",
    priceMonthly: 499900,
    priceAnnual: 4990000,
    credits: 12000,
    cta: "Start Team trial",
    features: [
      "12,000 AI credits / month",
      "Everything in Pro",
      "Shared workspaces & roles",
      "Audit logs & SSO (SAML)",
      "Dedicated support",
    ],
  },
];

export function getPlan(id: PlanId): PlanDefinition | undefined {
  return plans.find((p) => p.id === id);
}
