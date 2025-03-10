/*
  Warnings:

  - You are about to drop the `CompanyW2EmployeeCountryLocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CompanyW2EmployeeCountryLocation" DROP CONSTRAINT "CompanyW2EmployeeCountryLocation_companyId_fkey";

-- DropTable
DROP TABLE "CompanyW2EmployeeCountryLocation";

-- CreateTable
CREATE TABLE "CompanyEmployeeCountryLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyEmployeeCountryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEmployeeCountryLocation_companyId_country_key" ON "CompanyEmployeeCountryLocation"("companyId", "country");

-- AddForeignKey
ALTER TABLE "CompanyEmployeeCountryLocation" ADD CONSTRAINT "CompanyEmployeeCountryLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
