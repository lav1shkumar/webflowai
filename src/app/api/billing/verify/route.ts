import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/server/user";
import { razorpayProvider } from "@/features/billing/razorpay";
import { getPlan } from "@/features/billing/plans";
import { activatePaidSubscription } from "@/features/billing/activate";

export const runtime = "nodejs";

const schema = z.object({
  planId: z.enum(["pro", "team"]),
  cycle: z.enum(["monthly", "annual"]),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * Verify a completed Razorpay Checkout payment and activate the subscription.
 * Called by the client checkout handler after a successful payment.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }
  const {
    planId,
    cycle,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = parsed.data;

  // Verify the payment signature when Razorpay is configured.
  if (razorpayProvider.isConfigured) {
    const valid = razorpayProvider.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 400 },
      );
    }
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const plan = getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  // Activate the subscription, capture the payment, and refresh credits. This
  // is idempotent and shared with the webhook, so whichever fires first wins
  // and the other is a no-op.
  await activatePaidSubscription({
    userId: user.id,
    planId,
    cycle,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });

  return NextResponse.json({ ok: true, plan: planId.toUpperCase() });
}
