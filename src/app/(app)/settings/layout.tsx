"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppTopbar } from "@/components/app/topbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { routes } from "@/config/site";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Account", href: routes.settings },
  { label: "Billing", href: `${routes.settings}/billing` },
  { label: "Preferences", href: `${routes.settings}/preferences` },
  { label: "API Keys", href: `${routes.settings}/api-keys` },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      <AppTopbar title="Settings" />
      <ScrollArea className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 lg:flex-row lg:p-8">
          <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </ScrollArea>
    </>
  );
}
