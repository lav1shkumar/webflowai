"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  clerkAppearanceDark,
  clerkAppearanceLight,
} from "@/lib/clerk-appearance";

export function Providers({
  children,
  withAuth = false,
}: {
  children: React.ReactNode;
  withAuth?: boolean;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <InnerProviders withAuth={withAuth}>{children}</InnerProviders>
      <ThemedToaster />
    </ThemeProvider>
  );
}

/**
 * Inner providers that have access to the resolved theme.
 * Conditionally wraps children with ClerkProvider using the correct appearance.
 */
function InnerProviders({
  children,
  withAuth,
}: {
  children: React.ReactNode;
  withAuth: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const appearance =
    resolvedTheme === "light" ? clerkAppearanceLight : clerkAppearanceDark;

  const content = (
    <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
  );

  if (!withAuth) return content;

  return <ClerkProvider appearance={appearance}>{content}</ClerkProvider>;
}

/** Toast surface that follows the active theme (light / dark / system). */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "glass-strong !rounded-xl !border-border !text-foreground",
        },
      }}
    />
  );
}
