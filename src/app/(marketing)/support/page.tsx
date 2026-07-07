import { Mail, MessageCircle, Clock } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function SupportPage() {
  return (
    <div className="container-wide max-w-2xl py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight pt-10">
          How can we help?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Have a question, found a bug, or need help with your project? We&apos;re
          here for you.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card/40 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium text-foreground">Email</h3>
          <p className="text-sm text-muted-foreground">
            Drop us a line for any questions or issues.
          </p>
          <a
            href="mailto:support@webflowai.dev"
            className="inline-block text-sm text-primary hover:underline"
          >
            support@webflowai.dev
          </a>
        </div>

        <div className="rounded-xl border border-border bg-card/40 p-6 space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-medium text-foreground">Response time</h3>
          <p className="text-sm text-muted-foreground">
            We typically respond within 24 hours on business days.
          </p>
        </div>
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card/40 p-6">
        <h3 className="font-medium text-foreground">Common topics we help with</h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Account and billing issues
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Bug reports
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            Feature requests
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
            General questions about {siteConfig.name}
          </li>
        </ul>
      </div>
    </div>
  );
}
