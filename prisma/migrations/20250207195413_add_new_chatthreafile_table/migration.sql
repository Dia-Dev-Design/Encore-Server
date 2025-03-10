-- CreateTable
CREATE TABLE "ChatThreadFile" (
    "id" TEXT NOT NULL,
    "chatThreadId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThreadFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatThreadFile_fileId_idx" ON "ChatThreadFile"("fileId");

-- AddForeignKey
ALTER TABLE "ChatThreadFile" ADD CONSTRAINT "ChatThreadFile_chatThreadId_fkey" FOREIGN KEY ("chatThreadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThreadFile" ADD CONSTRAINT "ChatThreadFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
