import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote:
      "We shipped our internal CRM in an afternoon. WebFlowAI feels like having a senior team on call.",
    name: "Priya Sharma",
    role: "Founder, ClinicStack",
    initials: "PS",
  },
  {
    quote:
      "The live preview and terminal are the real deal — it's not a mockup, it actually runs my app.",
    name: "Marcus Lee",
    role: "Indie Hacker",
    initials: "ML",
  },
  {
    quote:
      "The multi-agent reviewer caught type errors before I even opened the editor. Wild.",
    name: "Ananya Rao",
    role: "Eng Lead, Fintech",
    initials: "AR",
  },
  {
    quote:
      "From prompt to a deployable expense tracker in minutes. Our prototyping velocity 10x'd.",
    name: "David Kim",
    role: "Product, Northwind",
    initials: "DK",
  },
  {
    quote:
      "Finally an AI builder with taste. The output looks like something a real design team made.",
    name: "Sofia Marino",
    role: "Designer & Builder",
    initials: "SM",
  },
  {
    quote:
      "Refactoring by conversation is addictive. It keeps full context of the whole project.",
    name: "Tom Becker",
    role: "CTO, LogiFlow",
    initials: "TB",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-28">
      <div className="container-wide">
        <SectionHeading
          eyebrow="Loved by builders"
          title="Teams ship faster with WebFlowAI"
          description="From solo founders to engineering teams, builders use WebFlowAI to go from idea to running product."
        />

        <div className="mt-16 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.06}>
              <figure className="break-inside-avoid rounded-2xl border border-border bg-card/40 p-6">
                <blockquote className="text-sm leading-relaxed text-foreground/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{t.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
