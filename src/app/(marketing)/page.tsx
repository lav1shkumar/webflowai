import { Hero } from "@/components/marketing/sections/hero";
import { ProductDemo } from "@/components/marketing/sections/product-demo";
import { Features } from "@/components/marketing/sections/features";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { TemplatesShowcase } from "@/components/marketing/sections/templates-showcase";
import { Testimonials } from "@/components/marketing/sections/testimonials";
import { Pricing } from "@/components/marketing/sections/pricing";
import { FAQ } from "@/components/marketing/sections/faq";
import { CTA } from "@/components/marketing/sections/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductDemo />
      <Features />
      <HowItWorks />
      <TemplatesShowcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
