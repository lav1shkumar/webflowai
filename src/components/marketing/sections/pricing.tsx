"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/features/billing/plans";
import { routes } from "@/config/site";
import { cn, formatINR } from "@/lib/utils";

export function Pricing() {
  const [annual, setAnnual] = React.useState(true);

  return (
    <section id="pricing" className="relative py-20">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[130px]" />
      <div className="container-wide">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, scalable pricing"
          description="Start free. Upgrade when you're ready to ship. India-first billing with UPI and cards via Razorpay."
        />

        <Reveal className="mt-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-sm",
              !annual ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual((v) => !v)}
            role="switch"
            aria-checked={annual}
            aria-label="Toggle annual billing"
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0 transition-colors",
              annual ? "bg-primary" : "bg-foreground/10",
            )}
          >
            <span
              className={cn(
                "pointer-events-none ml-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform",
                annual ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm",
              annual ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Annual
          </span>
          <Badge variant="success" className="ml-1">
            Save ~17%
          </Badge>
        </Reveal>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const price = annual ? plan.priceAnnual : plan.priceMonthly;
            const unit = annual ? "/year" : "/month";
            return (
              <Reveal key={plan.id} delay={i * 0.06}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-7",
                    plan.highlight
                      ? "border-primary/40 bg-card gradient-border"
                      : "border-border bg-card/40",
                  )}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-3 left-7">
                      Most popular
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.tagline}
                  </p>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight">
                      {price === 0 ? "₹0" : formatINR(price)}
                    </span>
                    {price > 0 && (
                      <span className="mb-1 text-sm text-muted-foreground">
                        {unit}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {plan.credits.toLocaleString()} AI credits / month
                  </p>

                  <Button
                    asChild
                    variant={plan.highlight ? "brand" : "outline"}
                    className="mt-6 w-full"
                  >
                    <Link href={routes.signUp}>{plan.cta}</Link>
                  </Button>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
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
