/*
  Warnings:

  - You are about to drop the column `isAiRelated` on the `FileReference` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[rootFolderId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('AI', 'DISSOLUTION', 'NONE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "rootFolderId" TEXT;

-- AlterTable
ALTER TABLE "FileReference" DROP COLUMN "isAiRelated",
ADD COLUMN     "fileType" "FileType" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderFileReference" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "areActionsLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolderFileReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_rootFolderId_key" ON "Company"("rootFolderId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderFileReference" ADD CONSTRAINT "FolderFileReference_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderFileReference" ADD CONSTRAINT "FolderFileReference_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
