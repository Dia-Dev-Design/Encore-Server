-- AlterTable
ALTER TABLE "ChatThread" ADD COLUMN     "chatType" TEXT NOT NULL DEFAULT 'CHATBOT';

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "isLawyer" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChatLawyer" (
    "id" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "ChatThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endService" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatLawyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatLawyerMessage" (
    "id" TEXT NOT NULL,
    "userMessageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lawyerId" TEXT,
    "userId" TEXT,

    CONSTRAINT "ChatLawyerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLawyer_lawyerId_idx" ON "ChatLawyer"("lawyerId");

-- CreateIndex
CREATE INDEX "ChatLawyer_ChatThreadId_idx" ON "ChatLawyer"("ChatThreadId");

-- AddForeignKey
ALTER TABLE "ChatLawyer" ADD CONSTRAINT "ChatLawyer_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatLawyer" ADD CONSTRAINT "ChatLawyer_ChatThreadId_fkey" FOREIGN KEY ("ChatThreadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatLawyerMessage" ADD CONSTRAINT "ChatLawyerMessage_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatLawyerMessage" ADD CONSTRAINT "ChatLawyerMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
