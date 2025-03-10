/*
  Warnings:

  - You are about to drop the column `country` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `employeeState` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Company" DROP COLUMN "country",
DROP COLUMN "employeeState",
DROP COLUMN "state";

-- CreateTable
CREATE TABLE "CompanyStateLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStateLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCountryLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCountryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyW2EmployeeStateLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyW2EmployeeStateLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStateLocation_companyId_state_key" ON "CompanyStateLocation"("companyId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCountryLocation_companyId_country_key" ON "CompanyCountryLocation"("companyId", "country");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyW2EmployeeStateLocation_companyId_state_key" ON "CompanyW2EmployeeStateLocation"("companyId", "state");

-- AddForeignKey
ALTER TABLE "CompanyStateLocation" ADD CONSTRAINT "CompanyStateLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCountryLocation" ADD CONSTRAINT "CompanyCountryLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyW2EmployeeStateLocation" ADD CONSTRAINT "CompanyW2EmployeeStateLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
