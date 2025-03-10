-- AlterTable
ALTER TABLE "ChatLawyerMessage" ADD COLUMN     "fileId" TEXT;

-- AddForeignKey
ALTER TABLE "ChatLawyerMessage" ADD CONSTRAINT "ChatLawyerMessage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
