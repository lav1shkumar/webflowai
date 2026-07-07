import { siteConfig } from "@/config/site";

export default function TermsPage() {
  return (
    <div className="container-wide max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 2025
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="mt-2">
            By using {siteConfig.name}, you agree to these terms. If you
            don&apos;t agree, please don&apos;t use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. The Service
          </h2>
          <p className="mt-2">
            {siteConfig.name} is an AI-powered development platform that
            generates code from natural-language prompts. The service is
            provided &quot;as is&quot; without warranties of any kind.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Your Account
          </h2>
          <p className="mt-2">
            You are responsible for maintaining the security of your account.
            You must not share your credentials or use the service for any
            illegal purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Ownership of Generated Code
          </h2>
          <p className="mt-2">
            You own all code and content generated through your use of the
            service. {siteConfig.name} does not claim any intellectual property
            rights over your output.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Credits and Billing
          </h2>
          <p className="mt-2">
            Paid plans are billed through Razorpay. Credits are non-refundable
            once used. Unused credits do not roll over between billing cycles
            unless stated otherwise in your plan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            6. Acceptable Use
          </h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the service to generate malicious or harmful code</li>
            <li>Attempt to bypass credit limits or abuse the AI pipeline</li>
            <li>Reverse-engineer or scrape the service</li>
            <li>Violate any applicable laws</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            7. Termination
          </h2>
          <p className="mt-2">
            We may suspend or terminate your access if you violate these terms.
            You can delete your account at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            8. Limitation of Liability
          </h2>
          <p className="mt-2">
            {siteConfig.name} is not liable for any damages arising from the use
            of generated code, service downtime, or data loss. Use the generated
            code at your own discretion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
          <p className="mt-2">
            Questions about these terms? Reach out at{" "}
            <a
              href="mailto:support@webflowai.dev"
              className="text-foreground underline"
            >
              support@webflowai.dev
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
