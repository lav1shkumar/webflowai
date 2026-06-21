"use client";

import { ArrowUpRight } from "lucide-react";
import { AppTopbar } from "@/components/app/topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { resolveIcon } from "@/components/shared/icon";
import { templates } from "@/features/templates/data";
import { shortId } from "@/lib/utils";
import { createProject } from "@/server/projects";

export default function TemplatesPage() {
  const launchTemplate = async (templateId: string, prompt: string, name: string) => {
    const params = new URLSearchParams({ prompt, template: templateId });
    // Full-document navigation (not router.push) so the workspace loads with
    // its COOP/COEP headers and is cross-origin isolated for WebContainers.
    try {
      const result = await createProject({ prompt, templateId, name });
      const id = result.ok ? result.id : shortId("proj");
      window.location.assign(`/workspace/${id}?${params.toString()}`);
    } catch {
      window.location.assign(`/workspace/${shortId("proj")}?${params.toString()}`);
    }
  };

  return (
    <>
      <AppTopbar title="Templates" />
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Production-grade starting points. Pick one to scaffold a project,
            then refine it by chatting with the AI.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const Icon = resolveIcon(template.icon);
              return (
                <button
                  key={template.id}
                  onClick={() =>
                    void launchTemplate(template.id, template.prompt, template.name)
                  }
                  className="group block h-full overflow-hidden rounded-2xl border border-border bg-card/40 text-left card-hover"
                >
                  <div
                    className={`relative h-28 bg-gradient-to-br ${template.gradient}`}
                  >
                    <div className="absolute inset-0 bg-grid-pattern bg-[size:24px_24px] opacity-20" />
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
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </>
  );
}
