"use client";

import * as React from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { examplePrompts } from "@/config/site";
import { shortId } from "@/lib/utils";
import { createProject } from "@/server/projects";

/**
 * PromptComposer — the dashboard's primary call-to-action. Captures a build
 * prompt, persists a new project, and routes into its workspace. Falls back to
 * an ephemeral in-memory workspace when persistence is unavailable (demo mode).
 */
export function PromptComposer() {
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const start = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || pending) return;
    setPending(true);
    const params = new URLSearchParams({ prompt: text });
    // Full-document navigation (not router.push) so the workspace loads with
    // its COOP/COEP headers and is cross-origin isolated for WebContainers.
    try {
      const result = await createProject({ prompt: text });
      const id = result.ok ? result.id : shortId("proj");
      window.location.assign(`/workspace/${id}?${params.toString()}`);
    } catch {
      window.location.assign(`/workspace/${shortId("proj")}?${params.toString()}`);
    }
  };

  return (
    <div className="gradient-border overflow-hidden">
      <div className="rounded-[inherit] bg-card/60 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          What do you want to build today?
        </div>

        <div className="relative mt-4">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void start(value);
            }}
            placeholder="Build a CRM for dentists with appointment scheduling…"
            className="min-h-[110px] resize-none border-border bg-background/40 pr-14 text-base"
            disabled={pending}
          />
          <Button
            size="icon"
            variant="brand"
            className="absolute bottom-3 right-3"
            onClick={() => void start(value)}
            disabled={!value.trim() || pending}
            aria-label="Start building"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void start(prompt)}
              disabled={pending}
              className="rounded-full border border-border bg-foreground/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
