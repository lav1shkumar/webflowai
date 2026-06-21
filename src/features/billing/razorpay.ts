import crypto from "node:crypto";
import { env } from "@/lib/env";
import { getPlan, type PlanId } from "./plans";
import type { BillingProvider, CheckoutSession } from "./provider";

/**
 * Razorpay billing adapter (India-first).
 *
 * Uses the Orders + Subscriptions REST API. When credentials are absent we
 * return a deterministic mock session so the billing UI is fully navigable
 * in demo mode. Webhook signatures are verified with HMAC-SHA256 per
 * Razorpay's spec.
 */
export class RazorpayProvider implements BillingProvider {
  readonly name = "razorpay" as const;

  private get configured(): boolean {
    return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
  }

  async createSubscriptionCheckout(input: {
    planId: PlanId;
    cycle: "monthly" | "annual";
    customerEmail: string;
    customerName?: string;
  }): Promise<CheckoutSession> {
    const plan = getPlan(input.planId);
    if (!plan) throw new Error(`Unknown plan: ${input.planId}`);

    const amount =
      input.cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;

    if (!this.configured) {
      return {
        provider: "razorpay",
        referenceId: `order_demo_${input.planId}_${input.cycle}`,
        amount,
        currency: "INR",
        keyId: "rzp_test_demo",
      };
    }

    const auth = Buffer.from(
      `${env.razorpayKeyId}:${env.razorpayKeySecret}`,
    ).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        notes: {
          planId: input.planId,
          cycle: input.cycle,
          email: input.customerEmail,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Razorpay order creation failed (${res.status}).`);
    }

    const order = (await res.json()) as { id: string };
    return {
      provider: "razorpay",
      referenceId: order.id,
      amount,
      currency: "INR",
      keyId: env.razorpayKeyId,
    };
  }

  /** Verify `X-Razorpay-Signature` for webhook payloads. */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = env.razorpayWebhookSecret;
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature),
      );
    } catch {
      return false;
    }
  }

  /** Whether real Razorpay credentials are present. */
  get isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Verify a Checkout payment per Razorpay's spec:
   * HMAC_SHA256(order_id + "|" + payment_id, key_secret) === signature.
   */
  verifyPaymentSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const secret = env.razorpayKeySecret;
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(input.signature),
      );
    } catch {
      return false;
    }
  }
}

export const razorpayProvider = new RazorpayProvider();
