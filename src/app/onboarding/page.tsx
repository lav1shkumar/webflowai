"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const useCases = [
  "Building a SaaS product",
  "Internal tools for my team",
  "Client / agency work",
  "Prototyping ideas",
  "Learning to build",
];

const roles = ["Founder", "Engineer", "Designer", "Product Manager", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [useCase, setUseCase] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);

  const steps = [
    {
      title: "What brings you to WebFlowAI?",
      subtitle: "We'll tailor your experience.",
      options: useCases,
      value: useCase,
      set: setUseCase,
    },
    {
      title: "What best describes you?",
      subtitle: "This helps us recommend templates.",
      options: roles,
      value: role,
      set: setRole,
    },
  ];

  const current = steps[step]!;
  const isLast = step === steps.length - 1;
  const canContinue = Boolean(current.value);

  const next = () => {
    if (isLast) router.push("/dashboard");
    else setStep((s) => s + 1);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-[0.1]" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-[520px] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[130px]" />

      <div className="relative w-full max-w-lg">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-foreground/10",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold tracking-tight">
              {current.title}
            </h1>
            <p className="mt-2 text-muted-foreground">{current.subtitle}</p>

            <div className="mt-7 space-y-2.5">
              {current.options.map((option) => {
                const selected = current.value === option;
                return (
                  <button
                    key={option}
                    onClick={() => current.set(option)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm transition-all",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border bg-card/40 text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    {option}
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? router.push("/dashboard") : setStep((s) => s - 1))}
          >
            {step === 0 ? "Skip" : "Back"}
          </Button>
          <Button variant="brand" onClick={next} disabled={!canContinue}>
            {isLast ? "Get started" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
