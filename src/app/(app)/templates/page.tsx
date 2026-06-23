"use client";

import { AppTopbar } from "@/components/app/topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() =>
                  void launchTemplate(template.id, template.prompt, template.name)
                }
                className="group flex h-44 flex-col rounded-2xl border border-border bg-card/40 p-5 text-left card-hover"
              >
                <span
                  className="text-3xl leading-none"
                  role="img"
                  aria-label={template.name}
                >
                  {template.emoji}
                </span>
                <span className="mt-4 text-sm font-medium">
                  {template.name}
                </span>
                <span className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </>
  );
}
