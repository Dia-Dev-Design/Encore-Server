/*
  Warnings:

  - A unique constraint covering the columns `[intellectualPropertyId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[financialDetailsId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "estatePropertyOrEquipmentDetails" TEXT,
ADD COLUMN     "financialDetailsId" TEXT,
ADD COLUMN     "intellectualPropertyId" TEXT;

-- CreateTable
CREATE TABLE "CompanyIntellectualProperty" (
    "id" TEXT NOT NULL,
    "hasIntellectualProperty" BOOLEAN NOT NULL DEFAULT false,
    "intellectualProperty" JSONB,
    "pendingIPApplicationDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyIntellectualProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyFinancialDetails" (
    "id" TEXT NOT NULL,
    "financialObligationsDetails" TEXT,
    "intendToHaveAssetDetails" TEXT,
    "ongoingNegotationsForSaleDetails" TEXT,
    "hasReceivedOffersDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyFinancialDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_intellectualPropertyId_key" ON "Company"("intellectualPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_financialDetailsId_key" ON "Company"("financialDetailsId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_intellectualPropertyId_fkey" FOREIGN KEY ("intellectualPropertyId") REFERENCES "CompanyIntellectualProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_financialDetailsId_fkey" FOREIGN KEY ("financialDetailsId") REFERENCES "CompanyFinancialDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;
