"use client";

import Link from "next/link";
import {
  FolderKanban,
  LayoutTemplate,
  Settings,
  Files,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { routes } from "@/config/site";
import { cn } from "@/lib/utils";

const items = [
  { label: "Files", icon: Files, key: "files" as const },
  { label: "Projects", icon: FolderKanban, href: routes.projects },
  { label: "Templates", icon: LayoutTemplate, href: routes.templates },
  { label: "Settings", icon: Settings, href: routes.settings },
];

export function WorkspaceRail({
  activePanel,
  onToggleFiles,
}: {
  activePanel: boolean;
  onToggleFiles: () => void;
}) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card/40 py-3">
      <Logo showWordmark={false} href={routes.dashboard} className="mb-3" />
      {items.map((item) => {
        const content = (
          <item.icon className="h-[18px] w-[18px]" />
        );
        const className = cn(
          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
          item.key === "files" && activePanel
            ? "bg-foreground/[0.08] text-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
        );
        return (
          <Tooltip key={item.label}>
            <TooltipTrigger asChild>
              {item.href ? (
                <Link href={item.href} className={className}>
                  {content}
                </Link>
              ) : (
                <button onClick={onToggleFiles} className={className}>
                  {content}
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
