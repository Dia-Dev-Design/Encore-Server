-- CreateTable
CREATE TABLE "CompanyW2EmployeeCountryLocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyW2EmployeeCountryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyW2EmployeeCountryLocation_companyId_country_key" ON "CompanyW2EmployeeCountryLocation"("companyId", "country");

-- AddForeignKey
ALTER TABLE "CompanyW2EmployeeCountryLocation" ADD CONSTRAINT "CompanyW2EmployeeCountryLocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
