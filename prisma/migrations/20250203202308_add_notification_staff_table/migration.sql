-- CreateTable
CREATE TABLE "NotificationsStaff" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readed" BOOLEAN NOT NULL DEFAULT false,
    "staffId" TEXT NOT NULL,
    "userOriginId" TEXT,
    "staffOriginIdString" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationsStaff_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificationsStaff" ADD CONSTRAINT "NotificationsStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationsStaff" ADD CONSTRAINT "NotificationsStaff_staffOriginIdString_fkey" FOREIGN KEY ("staffOriginIdString") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationsStaff" ADD CONSTRAINT "NotificationsStaff_userOriginId_fkey" FOREIGN KEY ("userOriginId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
