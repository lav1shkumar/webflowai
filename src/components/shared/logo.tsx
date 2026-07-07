import Link from "next/link";
import Image from "next/image";
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
      {/* Light mode: dark logo. Dark mode: light logo. */}
      <Image
        src="/webflowai_logo_dark.svg"
        alt="WebFlowAI"
        width={32}
        height={32}
        className="hidden dark:block rounded-lg"
      />
      <Image
        src="/webflowai_logo_light.svg"
        alt="WebFlowAI"
        width={32}
        height={32}
        className="block dark:hidden rounded-lg"
      />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          WebFlow<span className="text-gradient-brand">AI</span>
        </span>
      )}
    </Link>
  );
}
