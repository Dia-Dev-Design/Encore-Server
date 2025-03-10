/*
  Warnings:

  - You are about to drop the column `areActionsLocked` on the `FolderFileReference` table. All the data in the column will be lost.
  - Added the required column `product` to the `FolderFileReference` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductEnum" AS ENUM ('DISSOLUTION', 'CHATBOT');

-- AlterTable
ALTER TABLE "ChatThreadFile" ADD COLUMN     "fileTagId" TEXT;

-- AlterTable
ALTER TABLE "FolderFileReference" DROP COLUMN "areActionsLocked",
ADD COLUMN     "product" "ProductEnum" NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatThreadFile" ADD CONSTRAINT "ChatThreadFile_fileTagId_fkey" FOREIGN KEY ("fileTagId") REFERENCES "FileTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
