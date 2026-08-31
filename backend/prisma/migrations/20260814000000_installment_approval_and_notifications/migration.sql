-- AlterEnum
-- PaymentStatus gains PENDING_APPROVAL: a payment (installment or manual
-- full payment) that the student has completed/submitted proof for, but
-- which a Super Admin must still verify and approve before it is credited
-- as SUCCESS.
ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterEnum
-- NotificationType gains PAYMENT, used for installment reminders,
-- due/overdue notices, submitted/approved/rejected updates, and
-- all-installments-completed notices.
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Payment" ADD COLUMN "lastReminderSentAt" TIMESTAMP(3);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
