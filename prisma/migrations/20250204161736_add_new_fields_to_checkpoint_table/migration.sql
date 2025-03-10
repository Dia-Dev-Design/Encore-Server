-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('GOOD', 'BAD', 'NEUTRAL');

-- AlterTable
ALTER TABLE "checkpoints" ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentiment" "Sentiment" NOT NULL DEFAULT 'NEUTRAL';
