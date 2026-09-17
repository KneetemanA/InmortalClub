-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('FOUNDER', 'LIFA');

-- CreateEnum
CREATE TYPE "MemberBenefitRelation" AS ENUM ('HOLDER', 'FAMILY');

-- CreateTable
CREATE TABLE "benefits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BenefitType" NOT NULL,
    "discountPercentage" DECIMAL(65,30) NOT NULL,
    "onlyFullPass" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_benefits" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "relation" "MemberBenefitRelation" NOT NULL DEFAULT 'HOLDER',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_benefits_memberId_idx" ON "member_benefits"("memberId");

-- CreateIndex
CREATE INDEX "member_benefits_benefitId_idx" ON "member_benefits"("benefitId");

-- CreateIndex
CREATE UNIQUE INDEX "member_benefits_memberId_benefitId_key" ON "member_benefits"("memberId", "benefitId");

-- AddForeignKey
ALTER TABLE "member_benefits" ADD CONSTRAINT "member_benefits_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_benefits" ADD CONSTRAINT "member_benefits_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "benefits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
