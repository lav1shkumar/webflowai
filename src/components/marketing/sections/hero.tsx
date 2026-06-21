"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroConsole } from "@/components/marketing/hero-console";
import { routes } from "@/config/site";

const logos = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Pied Piper"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24">
      {/* Background layers — subtle, neutral depth (no colored glow) */}
      <div className="pointer-events-none absolute inset-0 spotlight" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-pattern bg-[size:64px_64px] mask-fade-b opacity-[0.25]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container-wide grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-foreground/[0.03] px-3 py-1.5 text-xs text-muted-foreground lg:mx-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Now with multi-agent generation
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Beta
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Build Full-Stack{" "}
            <span className="text-gradient-brand">SaaS Apps</span> With AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground lg:mx-0"
          >
            Turn ideas into production-ready applications using AI,
            WebContainers, and a conversational development workflow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Button asChild variant="brand" size="lg" className="group">
              <Link href={routes.signUp}>
                Start Building
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link href="#product-demo">
                <Play />
                Watch Demo
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-14"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground/70">
              Trusted by teams building the future
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:justify-start">
              {logos.map((logo) => (
                <span
                  key={logo}
                  className="text-sm font-semibold text-muted-foreground/50"
                >
                  {logo}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroConsole />
        </motion.div>
      </div>
    </section>
  );
}
