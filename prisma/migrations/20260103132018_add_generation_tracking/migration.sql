-- AlterTable
ALTER TABLE "IndustryInsight" ADD COLUMN     "generationError" TEXT,
ADD COLUMN     "generationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "IndustryInsight_generationStatus_idx" ON "IndustryInsight"("generationStatus");
