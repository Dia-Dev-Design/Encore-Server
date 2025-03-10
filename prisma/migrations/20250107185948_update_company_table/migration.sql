/*
  Warnings:

  - The `currentStage` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "status" TEXT,
DROP COLUMN "currentStage",
ADD COLUMN     "currentStage" TEXT;
