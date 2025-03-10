-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "chatCompanyId" TEXT;

-- CreateTable
CREATE TABLE "ChatCompany" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lawyerReqStatus" TEXT NOT NULL,

    CONSTRAINT "ChatCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatCompany_companyId_key" ON "ChatCompany"("companyId");

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_chatCompanyId_fkey" FOREIGN KEY ("chatCompanyId") REFERENCES "ChatCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCompany" ADD CONSTRAINT "ChatCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
