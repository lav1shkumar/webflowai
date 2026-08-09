import Link from "next/link";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tokenPacks } from "@/features/billing/token-packs";
import { routes } from "@/config/site";
import { cn, formatINR } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="relative py-20">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[130px]" />
      <div className="container-wide">
        <SectionHeading
          eyebrow="Pricing"
          title="Buy tokens. Build at your pace."
          description="One-time token packs with no subscription and no expiry. Pay with UPI or cards via Razorpay."
        />

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {tokenPacks.map((pack, i) => {
            return (
              <Reveal key={pack.id} delay={i * 0.06}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-7",
                    pack.highlight
                      ? "border-primary/40 bg-card gradient-border"
                      : "border-border bg-card/40",
                  )}
                >
                  {pack.highlight && (
                    <Badge className="absolute -top-3 left-7">
                      Most popular
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold">{pack.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pack.tagline}
                  </p>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {formatINR(pack.price)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pack.tokens.toLocaleString()} AI tokens · one-time
                  </p>

                  <Button
                    asChild
                    variant={pack.highlight ? "brand" : "outline"}
                    className="mt-6 w-full"
                  >
                    <Link href={routes.signUp}>Get {pack.name}</Link>
                  </Button>

                  <ul className="mt-7 space-y-3">
                    {pack.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
