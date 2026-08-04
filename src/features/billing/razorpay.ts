import crypto from "node:crypto";
import { getPlan, type PlanId } from "./plans";

/**
 * Razorpay billing helpers. When credentials are absent we
 * return a deterministic mock session so the billing UI is fully navigable
 * in demo mode.
 */
interface CheckoutSession {
  referenceId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
  );
}

export async function createRazorpayCheckout(input: {
  planId: PlanId;
  cycle: "monthly" | "annual";
  customerEmail: string;
}): Promise<CheckoutSession> {
  const plan = getPlan(input.planId);
  if (!plan) throw new Error(`Unknown plan: ${input.planId}`);

  const amount =
    input.cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      referenceId: `order_demo_${input.planId}_${input.cycle}`,
      amount,
      currency: "INR",
      keyId: "rzp_test_demo",
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
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

  if (!response.ok) {
    throw new Error(`Razorpay order creation failed (${response.status}).`);
  }

  const order = (await response.json()) as { id: string };
  return { referenceId: order.id, amount, currency: "INR", keyId };
}

export function verifyRazorpayWebhook(
  payload: string,
  signature: string,
): boolean {
  return matchesSignature(
    payload,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET,
  );
}

export function verifyRazorpayPayment(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  return matchesSignature(
    `${input.orderId}|${input.paymentId}`,
    input.signature,
    process.env.RAZORPAY_KEY_SECRET,
  );
}

function matchesSignature(
  payload: string,
  signature: string,
  secret: string | undefined,
): boolean {
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
