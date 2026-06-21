"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

/**
 * A fully styled demo auth form shown when Clerk credentials are absent.
 * Submitting routes into the product so the experience is explorable.
 */
export function DemoAuthCard({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const next = isSignUp ? "/onboarding" : "/dashboard";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isSignUp
          ? "Start building production-ready apps with AI."
          : "Sign in to continue to WebFlowAI."}
      </p>

      <div className="mt-7 space-y-2.5">
        <Button variant="outline" className="w-full" onClick={() => router.push(next)}>
          <Github className="h-4 w-4" /> Continue with GitHub
        </Button>
        <Button variant="outline" className="w-full" onClick={() => router.push(next)}>
          <Mail className="h-4 w-4" /> Continue with Google
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(next);
        }}
      >
        {isSignUp && (
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Alex Founder" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" variant="brand" className="w-full">
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-primary hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
