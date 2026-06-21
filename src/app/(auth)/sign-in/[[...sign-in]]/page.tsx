import { SignIn } from "@clerk/nextjs";
import { DemoAuthCard } from "@/components/auth/demo-auth-card";
import { isAuthConfigured } from "@/lib/env";

export default function SignInPage() {
  if (!isAuthConfigured) return <DemoAuthCard mode="sign-in" />;
  return (
    <SignIn
      appearance={{ elements: { rootBox: "mx-auto", card: "bg-transparent shadow-none" } }}
    />
  );
}
