import type { PlanId } from "./plans";

export interface CheckoutSession {
  referenceId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface BillingProvider {
  createSubscriptionCheckout(input: {
    planId: PlanId;
    cycle: "monthly" | "annual";
    customerEmail: string;
    customerName?: string;
  }): Promise<CheckoutSession>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
