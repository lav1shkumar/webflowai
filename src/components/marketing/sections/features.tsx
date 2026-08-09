import {
  Bot,
  Boxes,
  GitBranch,
  Globe,
  TerminalSquare,
  Workflow,
  Zap,
} from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";

const features = [
  {
    icon: Bot,
    title: "AI code generation",
    description:
      "Generate complete applications and refine them through conversation.",
    span: "lg:col-span-2",
  },
  {
    icon: TerminalSquare,
    title: "Real dev environment",
    description:
      "Full Node.js runtime in an isolated cloud sandbox — install, run, and debug for real.",
  },
  {
    icon: Globe,
    title: "Instant live preview",
    description:
      "Your app boots in the cloud and refreshes as it evolves. No deploys required.",
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
    title: "Live file updates",
    description: "Watch files appear in the workspace as they are generated.",
  },
  {
    icon: Boxes,
    title: "Curated templates",
    description: "Start from SaaS, CRM, AI, commerce, and internal-tool blueprints.",
  },
  {
    icon: GitBranch,
    title: "Project-aware edits",
    description: "The AI reads existing files and updates only what needs to change.",
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
