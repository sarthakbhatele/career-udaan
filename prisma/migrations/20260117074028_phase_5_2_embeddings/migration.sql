-- Delete existing RAGOutput rows (old quiz cache structure)
DELETE FROM "RAGOutput";
/*
  Warnings:

  - You are about to drop the column `embedding` on the `RAGOutput` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RAGOutput` table. All the data in the column will be lost.
  - Added the required column `difficulty` to the `RAGOutput` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RAGOutput_userId_idx";

-- AlterTable
ALTER TABLE "RAGOutput" DROP COLUMN "embedding",
DROP COLUMN "userId",
ADD COLUMN     "difficulty" TEXT NOT NULL,
ADD COLUMN     "questionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skillSet" TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "UserQuestionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuestionHistory_userId_domainId_idx" ON "UserQuestionHistory"("userId", "domainId");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionHistory_userId_questionId_key" ON "UserQuestionHistory"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UserQuestionHistory" ADD CONSTRAINT "UserQuestionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
