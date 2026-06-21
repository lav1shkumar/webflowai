"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentDbUser } from "@/server/user";

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "CREATED" | "AUTHORIZED" | "CAPTURED" | "REFUNDED" | "FAILED";
  method: string | null;
}

/** Real payment history for the current user, newest first. */
export async function getPayments(): Promise<PaymentRecord[]> {
  const user = await getCurrentDbUser();
  if (!user) return [];

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!subscription) return [];

  const payments = await prisma.payment.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return payments.map((p) => ({
    id: p.id,
    date: p.createdAt.toISOString(),
    amount: p.amount,
    currency: p.currency,
    status: p.status as PaymentRecord["status"],
    method: p.method,
  }));
}
