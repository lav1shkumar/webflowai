import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-lg shadow-primary/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          aria-hidden
        >
          <path
            d="M4 7l4 10 4-10 4 10 4-10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/20" />
      </span>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          WebFlow<span className="text-gradient-brand">AI</span>
        </span>
      )}
    </Link>
  );
}
