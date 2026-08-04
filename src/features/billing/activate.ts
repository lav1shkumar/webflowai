import { prisma } from "@/lib/prisma";

interface FulfillInput {
  userId: string;
  orderId: string;
  paymentId?: string;
  method?: string;
}

export async function fulfillTokenPack(
  input: FulfillInput,
): Promise<number | null> {
  const { userId, orderId, paymentId, method } = input;
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { userId, razorpayOrderId: orderId },
      select: { id: true, status: true, tokens: true },
    });
    if (!payment) return null;
    if (payment.status === "CAPTURED") return payment.tokens;

    const updated = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { not: "CAPTURED" },
      },
      data: {
        status: "CAPTURED",
        ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        ...(method ? { method } : {}),
      },
    });
    if (updated.count === 0) {
      const captured = await tx.payment.findUnique({
        where: { id: payment.id },
        select: { status: true, tokens: true },
      });
      return captured?.status === "CAPTURED" ? captured.tokens : null;
    }

    await tx.user.update({
      where: { id: userId },
      data: { tokensBalance: { increment: payment.tokens } },
    });

    return payment.tokens;
  });
}
