-- CreateTable
CREATE TABLE "LawyerUsers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LawyerUsers_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "LawyerUsers_userId_idx" ON "LawyerUsers"("userId");
-- CreateIndex
CREATE INDEX "LawyerUsers_lawyerId_idx" ON "LawyerUsers"("lawyerId");
-- AddForeignKey
ALTER TABLE "LawyerUsers"
ADD CONSTRAINT "LawyerUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "LawyerUsers"
ADD CONSTRAINT "LawyerUsers_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;