import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { routes } from "@/config/site";

export function CTA() {
  return (
    <section className="relative py-20">
      <div className="container-wide">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-8 py-20 text-center">
            <div className="pointer-events-none absolute inset-0 bg-dot-pattern bg-[size:24px_24px] opacity-[0.3]" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[120px]" />

            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Build your next SaaS{" "}
                <span className="text-gradient-brand">from a prompt</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                Join builders shipping production-ready applications with AI.
                Start free — no credit card required.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="brand" size="lg" className="group">
                  <Link href={routes.signUp}>
                    Start Building
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="lg">
                  <Link href="#pricing">View pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
