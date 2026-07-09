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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <InnerProviders>{children}</InnerProviders>
      <ThemedToaster />
    </ThemeProvider>
  );
}

/**
 * Inner providers that have access to the resolved theme.
 * Wraps children with ClerkProvider using the correct appearance.
 */
function InnerProviders({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const appearance =
    resolvedTheme === "light" ? clerkAppearanceLight : clerkAppearanceDark;

  return (
    <ClerkProvider appearance={appearance}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </ClerkProvider>
  );
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
