/*
  Warnings:

  - Added the required column `durationDays` to the `DissolutionFlowStep` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DissolutionFlowStep" ADD COLUMN     "durationDays" INTEGER NOT NULL,
ALTER COLUMN "totalTasks" DROP NOT NULL;
