import { prisma } from "@/lib/prisma";
import { getPlan, type PlanId } from "./plans";

export type PaidPlanId = Exclude<PlanId, "free">;

export interface ActivateInput {
  userId: string;
  planId: PaidPlanId;
  cycle: "monthly" | "annual";
  /** Razorpay order id, used to reconcile the pending payment row. */
  orderId?: string;
  paymentId?: string;
  method?: string;
}

/**
 * Activate (or upgrade) a user's paid subscription and reconcile its payment.
 *
 * This is the single source of truth for "a payment succeeded", called from
 * both the client `verify` route (instant UX) and the Razorpay webhook
 * (reliable backstop). It is **idempotent**: running it twice for the same
 * order leaves the subscription/payment in the same state, so the two paths
 * can safely both fire.
 */
export async function activatePaidSubscription(
  input: ActivateInput,
): Promise<void> {
  const { userId, planId, cycle, orderId, paymentId, method } = input;
  const plan = getPlan(planId);
  if (!plan) return;

  const amount = cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
  const now = new Date();
  const periodEnd = new Date(now);
  if (cycle === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const planEnum = planId.toUpperCase() as "PRO" | "TEAM";
  const cycleEnum = cycle === "annual" ? "ANNUAL" : "MONTHLY";

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: planEnum,
      status: "ACTIVE",
      billingCycle: cycleEnum,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      plan: planEnum,
      status: "ACTIVE",
      billingCycle: cycleEnum,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  if (orderId) {
    // Flip the pending payment recorded at checkout; create one if missing.
    const updated = await prisma.payment.updateMany({
      where: { subscriptionId: subscription.id, razorpayOrderId: orderId },
      data: {
        status: "CAPTURED",
        ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        ...(method ? { method } : {}),
      },
    });
    if (updated.count === 0) {
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount,
          currency: "INR",
          status: "CAPTURED",
          razorpayOrderId: orderId,
          ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
          ...(method ? { method } : {}),
        },
      });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { creditsMonthly: plan.credits, creditsBalance: plan.credits },
  });
}
