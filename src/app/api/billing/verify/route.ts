import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentDbUser } from "@/server/user";
import {
  isRazorpayConfigured,
  verifyRazorpayPayment,
} from "@/features/billing/razorpay";
import { fulfillTokenPack } from "@/features/billing/activate";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

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
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = parsed.data;

  // Verify the payment signature when Razorpay is configured.
  if (isRazorpayConfigured()) {
    const valid = verifyRazorpayPayment({
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

  const tokens = await fulfillTokenPack({
    userId: user.id,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
  });

  if (tokens === null) {
    return NextResponse.json(
      { error: "This order does not belong to the current user." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, tokens });
}
