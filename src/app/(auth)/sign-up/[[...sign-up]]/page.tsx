import { SignUp } from "@clerk/nextjs";
import { DemoAuthCard } from "@/components/auth/demo-auth-card";
import { isAuthConfigured } from "@/lib/env";

export default function SignUpPage() {
  if (!isAuthConfigured) return <DemoAuthCard mode="sign-up" />;
  return (
    <SignUp
      appearance={{ elements: { rootBox: "mx-auto", card: "bg-transparent shadow-none" } }}
    />
  );
}
