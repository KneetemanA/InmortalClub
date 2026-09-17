/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `benefits` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "benefits_type_key" ON "benefits"("type");
