ALTER TYPE "PaymentMethod" ADD VALUE 'MIXED';
ALTER TABLE "payments" ADD COLUMN "cashAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "transferAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "prorated" BOOLEAN NOT NULL DEFAULT false;
UPDATE "payments" SET "cashAmount" = "finalAmount" WHERE "paymentMethod" = 'CASH';
UPDATE "payments" SET "transferAmount" = "finalAmount" WHERE "paymentMethod" = 'TRANSFER';
