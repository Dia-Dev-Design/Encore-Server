/*
  Warnings:

  - The `structure` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CompanyStructure" AS ENUM ('CORPORATION', 'LLC');

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "structure",
ADD COLUMN     "structure" "CompanyStructure";

-- DropEnum
DROP TYPE "ComapanyStructure";
