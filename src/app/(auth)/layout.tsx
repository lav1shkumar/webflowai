import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-card/30 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-[0.12]" />
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-primary/[0.06] blur-[120px]" />
        <Logo />
        <div className="relative max-w-md space-y-5">
          <blockquote className="text-2xl font-medium leading-snug tracking-tight">
            “We shipped our internal CRM in an afternoon. WebFlowAI feels like
            having a senior team on call.”
          </blockquote>
          <div className="text-sm text-muted-foreground">
            Priya Sharma — Founder, ClinicStack
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} WebFlowAI
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link href="#" className="underline hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
