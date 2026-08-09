"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What exactly does WebFlowAI build?",
    a: "Web applications using Next.js, React, and TypeScript by default. The generation pipeline plans the files, writes the code, and then runs it live in your workspace.",
  },
  {
    q: "How does the development environment work?",
    a: "Each project runs in an isolated cloud sandbox with a real Node.js runtime, terminal, and live preview.",
  },
  {
    q: "Can I keep editing after generation?",
    a: "Yes. The workspace is conversational: ask for new features, refactors, fixes, or explanations and the AI iterates with full project context. You can also edit files directly.",
  },
  {
    q: "Do I own the code?",
    a: "Completely. Everything generated is yours — export it, deploy it anywhere, or keep iterating inside WebFlowAI.",
  },
  {
    q: "What about billing in India?",
    a: "Billing is India-first via Razorpay with UPI, cards, and net-banking.",
  },
  {
    q: "Can I try WebFlowAI for free?",
    a: "Yes — new accounts include 200 AI tokens. There is no subscription, and you can buy more tokens whenever you need them.",
  },
];

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20">
      <div className="container-tight">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything you need to know about building with WebFlowAI."
        />

        <div className="mx-auto mt-14 max-w-3xl space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-border bg-card/40"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium">{faq.q}</span>
                  <Plus
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-45",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
