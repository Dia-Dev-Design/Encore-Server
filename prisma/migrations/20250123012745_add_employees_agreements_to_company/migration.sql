-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "areEmployeesInBargainingAgreements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "employeesInBargainingAgreementsDetails" TEXT;
