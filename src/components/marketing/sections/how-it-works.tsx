import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";

const steps = [
  {
    n: "01",
    title: "Describe your idea",
    description:
      "Tell WebFlowAI what you want to build in plain English — a CRM, an AI tool, a storefront.",
  },
  {
    n: "02",
    title: "Agents plan & build",
    description:
      "The Planner, Architect, and Generator agents design the structure and write the code.",
  },
  {
    n: "03",
    title: "Preview runs live",
    description:
      "Your app boots in a real in-browser runtime. See it work, instantly.",
  },
  {
    n: "04",
    title: "Refine by chatting",
    description:
      "Ask for changes, new features, or fixes. The workspace iterates with full context.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
      <div className="container-wide">
        <SectionHeading
          eyebrow="How it works"
          title="From prompt to product in four steps"
          description="A conversational workflow that feels like pair-programming with a senior team."
        />

        <div className="relative mt-16">
          <div className="absolute left-0 top-8 hidden h-px w-full bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.08}>
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-lg font-bold text-gradient-brand">
                    {step.n}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
