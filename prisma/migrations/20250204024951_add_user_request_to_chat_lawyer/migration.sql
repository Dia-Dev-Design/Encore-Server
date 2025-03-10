/*
  Warnings:

  - Added the required column `userRequestId` to the `ChatLawyer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatLawyer" ADD COLUMN     "userRequestId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatLawyer" ADD CONSTRAINT "ChatLawyer_userRequestId_fkey" FOREIGN KEY ("userRequestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
