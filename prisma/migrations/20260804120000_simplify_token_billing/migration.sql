ALTER TABLE "User" RENAME COLUMN "creditsBalance" TO "tokensBalance";

ALTER TABLE "User" DROP COLUMN "creditsMonthly";

ALTER TABLE "Payment" ADD COLUMN "userId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "packId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "tokens" INTEGER;

UPDATE "Payment"
SET
    "userId" = "Subscription"."userId",
    "packId" = 'legacy',
    "tokens" = 0
FROM "Subscription"
WHERE "Payment"."subscriptionId" = "Subscription"."id";

ALTER TABLE "Payment" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "packId" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "tokens" SET NOT NULL;

ALTER TABLE "Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";
DROP INDEX "Payment_subscriptionId_createdAt_idx";
ALTER TABLE "Payment" DROP COLUMN "subscriptionId";

DROP TABLE "Subscription";
DROP TYPE "Plan";
DROP TYPE "SubscriptionStatus";
DROP TYPE "BillingCycle";

CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
