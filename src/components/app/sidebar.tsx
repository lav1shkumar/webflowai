"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Settings,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/site";
import { cn } from "@/lib/utils";
import { useViewer } from "@/components/app/viewer-provider";

const nav = [
  { label: "Dashboard", href: routes.dashboard, icon: LayoutDashboard },
  { label: "Projects", href: routes.projects, icon: FolderKanban },
  { label: "Templates", href: routes.templates, icon: LayoutTemplate },
  { label: "Settings", href: routes.settings, icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const viewer = useViewer();
  const creditPct = Math.min(
    100,
    Math.round((viewer.creditsBalance / Math.max(1, viewer.creditsMonthly)) * 100),
  );

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/50 p-4 md:flex">
      <div className="px-2 py-2">
        <Logo />
      </div>

      <Button asChild variant="brand" className="mt-6 w-full justify-start">
        <Link href={routes.dashboard + "?new=1"}>
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </Button>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== routes.dashboard && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border bg-card/50 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">AI Credits</span>
          <span className="font-medium text-foreground">
            {viewer.creditsBalance} / {viewer.creditsMonthly}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full bg-brand-gradient"
            style={{ width: `${creditPct}%` }}
          />
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
          <Link href={routes.billing}>Upgrade plan</Link>
        </Button>
      </div>
    </aside>
  );
}
