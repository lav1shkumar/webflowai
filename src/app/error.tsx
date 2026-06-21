"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for error reporting (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-destructive/10 blur-[120px]" />
      <span className="text-sm font-medium text-destructive">
        Something went wrong
      </span>
      <h1 className="mt-3 max-w-md text-2xl font-bold tracking-tight">
        We hit an unexpected error
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The error has been logged. You can retry, or head back to your
        dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="brand" onClick={reset}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
