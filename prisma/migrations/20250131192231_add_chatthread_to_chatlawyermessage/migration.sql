/*
  Warnings:

  - Added the required column `ChatThreadId` to the `ChatLawyerMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatLawyerMessage" ADD COLUMN     "ChatThreadId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatLawyerMessage" ADD CONSTRAINT "ChatLawyerMessage_ChatThreadId_fkey" FOREIGN KEY ("ChatThreadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
