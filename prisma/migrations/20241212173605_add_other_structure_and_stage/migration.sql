/*
  Warnings:

  - The values [OTHER] on the enum `ComapanyStructure` will be removed. If these variants are still used in the database, this will fail.
  - The values [OTHER] on the enum `CurrentStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ComapanyStructure_new" AS ENUM ('CORPORATION', 'LLC');
ALTER TABLE "Company" ALTER COLUMN "structure" TYPE "ComapanyStructure_new" USING ("structure"::text::"ComapanyStructure_new");
ALTER TYPE "ComapanyStructure" RENAME TO "ComapanyStructure_old";
ALTER TYPE "ComapanyStructure_new" RENAME TO "ComapanyStructure";
DROP TYPE "ComapanyStructure_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CurrentStage_new" AS ENUM ('RECENTLY_DECIDED_SHUTDOWN', 'MIDDLE_OF_SHUTDOWN', 'PARTIAL_UNWIND', 'DISTRESSED_SALE', 'UNDECIDED');
ALTER TABLE "Company" ALTER COLUMN "currentStage" TYPE "CurrentStage_new" USING ("currentStage"::text::"CurrentStage_new");
ALTER TYPE "CurrentStage" RENAME TO "CurrentStage_old";
ALTER TYPE "CurrentStage_new" RENAME TO "CurrentStage";
DROP TYPE "CurrentStage_old";
COMMIT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "otherStage" TEXT,
ADD COLUMN     "otherStructure" TEXT;
