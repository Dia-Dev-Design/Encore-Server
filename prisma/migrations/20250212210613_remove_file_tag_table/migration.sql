/*
  Warnings:

  - You are about to drop the column `fileTagId` on the `ChatThreadFile` table. All the data in the column will be lost.
  - You are about to drop the `FileTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatThreadFile" DROP CONSTRAINT "ChatThreadFile_fileTagId_fkey";

-- AlterTable
ALTER TABLE "ChatThreadFile" DROP COLUMN "fileTagId";

-- DropTable
DROP TABLE "FileTag";
