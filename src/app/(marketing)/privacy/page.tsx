import { siteConfig } from "@/config/site";

export default function PrivacyPage() {
  return (
    <div className="container-wide max-w-3xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 2025
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p className="mt-2">
            When you use {siteConfig.name}, we collect information you provide
            directly — your email, name, and payment details when subscribing.
            We also collect usage data such as prompts sent, projects created,
            and general interaction patterns to improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To provide and maintain the service</li>
            <li>To process payments and manage your subscription</li>
            <li>To send important updates about the service</li>
            <li>To improve and personalize your experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Your Code and Projects
          </h2>
          <p className="mt-2">
            Code you generate through {siteConfig.name} belongs to you. We do
            not claim ownership over your projects or generated output. Project
            data is stored to enable persistence across sessions and is not
            shared with third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            4. Third-Party Services
          </h2>
          <p className="mt-2">
            We use third-party services for authentication (Clerk), payments
            (Razorpay), and AI processing (Google Vertex AI). These services
            have their own privacy policies governing their use of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            5. Data Retention
          </h2>
          <p className="mt-2">
            We retain your data as long as your account is active. You can
            request deletion of your account and associated data by contacting
            us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
          <p className="mt-2">
            For privacy-related questions, reach out at{" "}
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
