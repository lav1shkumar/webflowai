import type { PlanId } from "./plans";

/**
 * Provider-agnostic billing contract. Razorpay is the default implementation;
 * a Stripe adapter can be added later without touching call sites.
 */
export interface CheckoutSession {
  provider: "razorpay" | "stripe";
  /** Order or subscription id used by the client checkout widget. */
  referenceId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface BillingProvider {
  readonly name: "razorpay" | "stripe";
  createSubscriptionCheckout(input: {
    planId: PlanId;
    cycle: "monthly" | "annual";
    customerEmail: string;
    customerName?: string;
  }): Promise<CheckoutSession>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
