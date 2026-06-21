import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-[0.1]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
      <Logo />
      <h1 className="mt-10 text-7xl font-bold tracking-tight text-gradient-brand">
        404
      </h1>
      <p className="mt-4 max-w-sm text-muted-foreground">
        We couldn&apos;t find the page you were looking for.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
