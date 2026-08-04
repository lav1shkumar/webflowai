import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";
import { createRazorpayCheckout } from "@/features/billing/razorpay";
import { getTokenPack } from "@/features/billing/token-packs";

const schema = z.object({
  packId: z.enum(["starter", "builder", "scale"]),
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

  const { packId } = parsed.data;
  const pack = getTokenPack(packId);

  try {
    const user = await getCurrentDbUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await createRazorpayCheckout({
      packId,
      customerEmail: user.email,
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        packId: pack.id,
        tokens: pack.tokens,
        amount: session.amount,
        currency: session.currency,
        status: "CREATED",
        razorpayOrderId: session.referenceId,
      },
    });

    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
