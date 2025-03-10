-- CreateTable
CREATE TABLE "CompanyServices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyServices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompanyServices" ADD CONSTRAINT "CompanyServices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
