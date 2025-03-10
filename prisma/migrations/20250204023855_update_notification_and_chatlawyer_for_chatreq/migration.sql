-- DropForeignKey
ALTER TABLE "ChatLawyer" DROP CONSTRAINT "ChatLawyer_lawyerId_fkey";

-- AlterTable
ALTER TABLE "ChatLawyer" ADD COLUMN     "statusRequest" TEXT NOT NULL DEFAULT 'requested',
ALTER COLUMN "lawyerId" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "NotificationsStaff" ADD COLUMN     "actionRedirectId" TEXT;

-- AddForeignKey
ALTER TABLE "ChatLawyer" ADD CONSTRAINT "ChatLawyer_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
