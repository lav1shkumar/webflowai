import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { resolveIcon } from "@/components/shared/icon";
import { Badge } from "@/components/ui/badge";
import { templates } from "@/features/templates/data";
import { routes } from "@/config/site";

export function TemplatesShowcase() {
  return (
    <section id="templates" className="relative py-28">
      <div className="container-wide">
        <SectionHeading
          eyebrow="Templates"
          title="Start from a polished blueprint"
          description="Production-grade starting points across the most common SaaS categories. Fork one and refine by chatting."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, i) => {
            const Icon = resolveIcon(template.icon);
            return (
              <Reveal key={template.id} delay={i * 0.04}>
                <Link
                  href={routes.signUp}
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card/40 card-hover"
                >
                  <div
                    className={`relative h-32 bg-gradient-to-br ${template.gradient}`}
                  >
                    <div className="absolute inset-0 bg-dot-pattern bg-[size:20px_20px] opacity-25" />
                    <div className="absolute bottom-3 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-black/30 backdrop-blur-md ring-1 ring-white/20">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {template.popular && (
                      <Badge
                        variant="glass"
                        className="absolute right-3 top-3 text-white"
                      >
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{template.name}</h3>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
