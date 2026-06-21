import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayProvider } from "@/features/billing/razorpay";
import {
  activatePaidSubscription,
  type PaidPlanId,
} from "@/features/billing/activate";

export const runtime = "nodejs";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  method?: string;
}

interface RazorpayOrderEntity {
  id?: string;
  notes?: { planId?: string; cycle?: string };
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

  if (!razorpayProvider.verifyWebhookSignature(payload, signature)) {
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
        // Authoritative success path: activate the plan even if the client
        // never reached /api/billing/verify.
        await handleOrderPaid(event.payload?.order?.entity, entity);
        break;
      case "payment.captured":
        await updatePaymentByOrder(entity, "CAPTURED");
        break;
      case "payment.failed":
        await updatePaymentByOrder(entity, "FAILED");
        break;
      // Subscription lifecycle events would reconcile Subscription rows here.
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.completed":
      case "subscription.cancelled":
      default:
        break;
    }
  } catch {
    // Swallow processing errors — Razorpay retries on non-2xx, and we don't
    // want to fail the webhook on a transient/unknown record.
  }

  return NextResponse.json({ received: true });
}

/**
 * Activate a paid subscription from an `order.paid` event. The order's `notes`
 * carry the planId/cycle we set at checkout; the user is resolved from the
 * pending payment recorded against the order. Falls back to just capturing the
 * payment if the plan can't be resolved.
 */
async function handleOrderPaid(
  order: RazorpayOrderEntity | undefined,
  payment: RazorpayPaymentEntity | undefined,
): Promise<void> {
  if (!order?.id) return;

  const planId = order.notes?.planId;
  const cycle = order.notes?.cycle;
  const isPaidPlan = planId === "pro" || planId === "team";
  const isCycle = cycle === "monthly" || cycle === "annual";

  const paymentRow = await prisma.payment.findFirst({
    where: { razorpayOrderId: order.id },
    select: { subscription: { select: { userId: true } } },
  });
  const userId = paymentRow?.subscription?.userId;

  if (!userId || !isPaidPlan || !isCycle) {
    // Can't resolve the plan/user — still reconcile the payment status.
    await updatePaymentByOrder(
      { order_id: order.id, id: payment?.id, method: payment?.method },
      "CAPTURED",
    );
    return;
  }

  await activatePaidSubscription({
    userId,
    planId: planId as PaidPlanId,
    cycle: cycle as "monthly" | "annual",
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
