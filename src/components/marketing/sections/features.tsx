import {
  Bot,
  Boxes,
  GitBranch,
  Globe,
  ShieldCheck,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";

const features = [
  {
    icon: Bot,
    title: "Multi-agent generation",
    description:
      "Planner, Architect, Generator, and Reviewer agents collaborate to ship correct, idiomatic code.",
    span: "lg:col-span-2",
  },
  {
    icon: TerminalSquare,
    title: "Real dev environment",
    description:
      "Full Node.js runtime in the browser via WebContainers — install, run, and debug for real.",
  },
  {
    icon: Globe,
    title: "Instant live preview",
    description:
      "Your app boots in-browser and refreshes as it evolves. No deploys required.",
  },
  {
    icon: Workflow,
    title: "Conversational editing",
    description:
      "Refine, refactor, and add features by chatting. The workspace keeps full context.",
    span: "lg:col-span-2",
  },
  {
    icon: Zap,
    title: "Streaming responses",
    description: "Watch code and reasoning stream token-by-token.",
  },
  {
    icon: Boxes,
    title: "Curated templates",
    description: "Start from SaaS, CRM, AI, commerce, and internal-tool blueprints.",
  },
  {
    icon: GitBranch,
    title: "Versioned changes",
    description: "Every generation is an auditable, reversible set of file changes.",
  },
  {
    icon: ShieldCheck,
    title: "Production patterns",
    description: "Strict TypeScript, error boundaries, and secure defaults baked in.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20">
      <div className="container-wide">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to ship"
          description="A complete, opinionated environment for going from idea to running application — without leaving the browser."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal
              key={feature.title}
              delay={i * 0.04}
              className={feature.span}
            >
              <div className="group h-full rounded-2xl border border-border bg-card/40 p-6 card-hover">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-colors group-hover:bg-primary/15">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
