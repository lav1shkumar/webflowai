"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { examplePrompts } from "@/config/site";

const buildSteps = [
  "Planning architecture",
  "Designing components",
  "Generating code",
  "Applying changes",
  "Reviewing output",
];

/**
 * A self-running mock of the generation console shown in the hero.
 * It cycles through example prompts and a faux multi-agent build to
 * communicate the product experience without a backend.
 */
export function HeroConsole() {
  const [promptIndex, setPromptIndex] = React.useState(0);
  const [typed, setTyped] = React.useState("");
  const [phase, setPhase] = React.useState<"typing" | "building" | "done">(
    "typing",
  );
  const [step, setStep] = React.useState(0);

  // Typewriter for the current prompt.
  React.useEffect(() => {
    if (phase !== "typing") return;
    const full = examplePrompts[promptIndex] ?? "";
    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("building"), 500);
    return () => clearTimeout(t);
  }, [typed, phase, promptIndex]);

  // Step through the build phases.
  React.useEffect(() => {
    if (phase !== "building") return;
    if (step < buildSteps.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 620);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("done"), 900);
    return () => clearTimeout(t);
  }, [step, phase]);

  // Reset for the next prompt.
  React.useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => {
      setTyped("");
      setStep(0);
      setPromptIndex((i) => (i + 1) % examplePrompts.length);
      setPhase("typing");
    }, 1800);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="gradient-border w-full overflow-hidden">
      <div className="rounded-[inherit] bg-card/60 backdrop-blur-xl">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-amber-500/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-xs text-muted-foreground">
            webflowai — new project
          </span>
        </div>

        <div className="space-y-4 p-5">
          {/* Prompt input */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="min-h-[2.5rem] text-left text-sm leading-relaxed text-foreground">
              {typed}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-primary" />
            </p>
          </div>

          {/* Build trace */}
          <div className="space-y-2">
            {buildSteps.map((label, i) => {
              const active = phase !== "typing" && i < step;
              const current = phase === "building" && i === step;
              return (
                <div
                  key={label}
                  className="flex items-center gap-3 text-sm"
                  style={{ opacity: active || current ? 1 : 0.3 }}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    {current ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : active ? (
                      <CheckDot />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                  <span
                    className={
                      active
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
              >
                <span className="text-sm font-medium text-emerald-300">
                  App ready — preview is live
                </span>
                <ArrowRight className="h-4 w-4 text-emerald-300" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CheckDot() {
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15">
      <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-400" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
