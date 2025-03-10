-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "stepName" TEXT,
ADD COLUMN     "stepPosition" INTEGER,
ADD COLUMN     "taskPosition" INTEGER;
