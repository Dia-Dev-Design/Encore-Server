-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "chatFileId" TEXT;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_chatFileId_fkey" FOREIGN KEY ("chatFileId") REFERENCES "FileReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
