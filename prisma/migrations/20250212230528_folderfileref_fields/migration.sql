-- AlterTable
ALTER TABLE "FileReference" ADD COLUMN     "originalName" TEXT;

-- AlterTable
ALTER TABLE "FolderFileReference" ADD COLUMN     "staffId" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "FolderFileReference_userId_idx" ON "FolderFileReference"("userId");

-- CreateIndex
CREATE INDEX "FolderFileReference_staffId_idx" ON "FolderFileReference"("staffId");

-- AddForeignKey
ALTER TABLE "FolderFileReference" ADD CONSTRAINT "FolderFileReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderFileReference" ADD CONSTRAINT "FolderFileReference_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
