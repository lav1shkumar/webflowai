import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { razorpayProvider } from "@/features/billing/razorpay";

const schema = z.object({
  planId: z.enum(["free", "pro", "team"]),
  cycle: z.enum(["monthly", "annual"]),
  email: z.string().email().optional(),
  name: z.string().optional(),
});

/**
 * Create a Razorpay order and record a PENDING payment for it, so the billing
 * history reflects in-progress attempts (which flip to CAPTURED on success or
 * FAILED via the webhook).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { planId, cycle, email, name } = parsed.data;

  if (planId === "free") {
    return NextResponse.json(
      { error: "The Free plan does not require checkout." },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentDbUser();
    const session = await razorpayProvider.createSubscriptionCheckout({
      planId,
      cycle,
      customerEmail: email ?? user?.email ?? "demo@webflowai.dev",
      customerName: name ?? user?.name ?? undefined,
    });

    // Record the attempt as a pending payment (needs a subscription to hang
    // off — create a baseline FREE subscription if the user has none yet).
    if (user) {
      const subscription = await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, plan: "FREE", status: "ACTIVE" },
      });
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: session.amount,
          currency: session.currency,
          status: "CREATED",
          razorpayOrderId: session.referenceId,
        },
      });
    }

    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
