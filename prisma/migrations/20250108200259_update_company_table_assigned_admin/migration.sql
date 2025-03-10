-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "assignedAdminId" TEXT;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
