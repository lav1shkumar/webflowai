"use client";

import Link from "next/link";
import { Bell, Search, Settings, LogOut, CreditCard } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ClerkSignOutItem } from "@/components/app/sign-out-item";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useViewer } from "@/components/app/viewer-provider";
import { routes } from "@/config/site";

export function AppTopbar({ title }: { title?: string }) {
  const viewer = useViewer();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/70 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search projects…"
            className="h-9 w-56 rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-foreground/[0.06]">
              <Avatar className="h-8 w-8">
                {viewer.avatarUrl && (
                  <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                )}
                <AvatarFallback>{viewer.initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 py-1">
                <Avatar className="h-9 w-9">
                  {viewer.avatarUrl && (
                    <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
                  )}
                  <AvatarFallback>{viewer.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {viewer.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {viewer.email}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <div className="px-2.5 pb-1.5">
              <Badge variant="default">{viewer.plan} plan</Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={routes.settings}>
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={routes.billing}>
                <CreditCard /> Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {viewer.authConfigured && viewer.signedIn ? (
              <ClerkSignOutItem />
            ) : (
              <DropdownMenuItem asChild>
                <Link href={routes.home}>
                  <LogOut /> Sign out
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
