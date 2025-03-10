/*
  Warnings:

  - A unique constraint covering the columns `[companyId,service]` on the table `CompanyServices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CompanyServices" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "CompanyServices_companyId_service_key" ON "CompanyServices"("companyId", "service");
