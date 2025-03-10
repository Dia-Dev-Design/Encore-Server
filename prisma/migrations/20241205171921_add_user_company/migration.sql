-- CreateEnum
CREATE TYPE "ComapanyStructure" AS ENUM ('CORPORATION', 'LLC', 'OTHER');

-- CreateEnum
CREATE TYPE "CurrentStage" AS ENUM ('RECENTLY_DECIDED_SHUTDOWN', 'MIDDLE_OF_SHUTDOWN', 'PARTIAL_UNWIND', 'DISTRESSED_SALE', 'UNDECIDED', 'OTHER');

-- CreateEnum
CREATE TYPE "UserCompanyRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "currentStage" "CurrentStage",
ADD COLUMN     "employeeState" TEXT,
ADD COLUMN     "hasCompletedSetup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasRaisedCapital" BOOLEAN,
ADD COLUMN     "hasW2Employees" BOOLEAN,
ADD COLUMN     "structure" "ComapanyStructure";

-- CreateTable
CREATE TABLE "UserCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "UserCompanyRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCompany_userId_idx" ON "UserCompany"("userId");

-- CreateIndex
CREATE INDEX "UserCompany_companyId_idx" ON "UserCompany"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCompany_userId_companyId_key" ON "UserCompany"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompany" ADD CONSTRAINT "UserCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
