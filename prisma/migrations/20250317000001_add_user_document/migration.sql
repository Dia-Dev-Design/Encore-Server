-- CreateTable
CREATE TABLE "UserDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "UserDocument_fileId_key" ON "UserDocument"("fileId");
-- CreateIndex
CREATE INDEX "UserDocument_userId_idx" ON "UserDocument"("userId");
-- AddForeignKey
ALTER TABLE "UserDocument"
ADD CONSTRAINT "UserDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "UserDocument"
ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;