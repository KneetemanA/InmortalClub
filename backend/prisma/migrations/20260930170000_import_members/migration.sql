ALTER TABLE "members" ALTER COLUMN "dni" DROP NOT NULL;
ALTER TABLE "members" ADD COLUMN "importKey" TEXT,
ADD COLUMN "importedExpirationDate" TIMESTAMP(3),
ADD COLUMN "importedData" JSONB,
ADD COLUMN "currentPlanId" TEXT;
CREATE UNIQUE INDEX "members_importKey_key" ON "members"("importKey");
ALTER TABLE "members" ADD CONSTRAINT "members_currentPlanId_fkey" FOREIGN KEY ("currentPlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD COLUMN "adjustmentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
