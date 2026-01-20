-- DropIndex
DROP INDEX "QuizAttempt_userId_attemptDate_idx";

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "quizType" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "quizType" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_userId_quizType_idx" ON "Assessment"("userId", "quizType");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_quizType_attemptDate_idx" ON "QuizAttempt"("userId", "quizType", "attemptDate");
