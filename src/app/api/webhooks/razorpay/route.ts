import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhook } from "@/features/billing/razorpay";
import { fulfillTokenPack } from "@/features/billing/activate";

export const runtime = "nodejs";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  method?: string;
}

interface RazorpayOrderEntity {
  id?: string;
}

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: RazorpayOrderEntity };
  };
}

/**
 * Razorpay webhook receiver.
 *
 * Verifies the HMAC signature, then reconciles payment state — marking
 * attempts captured or failed and backfilling the real payment method. The
 * raw body must be read as text for signature verification.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const payload = await request.text();

  if (!verifyRazorpayWebhook(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;

  try {
    switch (event.event) {
      case "order.paid":
        await handleOrderPaid(event.payload?.order?.entity, entity);
        break;
      case "payment.failed":
        await updatePaymentByOrder(entity, "FAILED");
        break;
      default:
        break;
    }
  } catch {
    // Swallow processing errors — Razorpay retries on non-2xx, and we don't
    // want to fail the webhook on a transient/unknown record.
  }

  return NextResponse.json({ received: true });
}

async function handleOrderPaid(
  order: RazorpayOrderEntity | undefined,
  payment: RazorpayPaymentEntity | undefined,
): Promise<void> {
  if (!order?.id) return;

  const paymentRow = await prisma.payment.findFirst({
    where: { razorpayOrderId: order.id },
    select: { userId: true },
  });
  const userId = paymentRow?.userId;

  if (!userId) return;

  await fulfillTokenPack({
    userId,
    orderId: order.id,
    paymentId: payment?.id,
    method: payment?.method,
  });
}

async function updatePaymentByOrder(
  entity: RazorpayPaymentEntity | undefined,
  status: "CAPTURED" | "FAILED",
): Promise<void> {
  if (!entity?.order_id) return;
  await prisma.payment.updateMany({
    where: { razorpayOrderId: entity.order_id },
    data: {
      status,
      ...(entity.id ? { razorpayPaymentId: entity.id } : {}),
      ...(entity.method ? { method: entity.method } : {}),
    },
  });
}
