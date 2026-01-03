/*
  Warnings:

  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `industry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `skills` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_industry_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio",
DROP COLUMN "experience",
DROP COLUMN "industry",
DROP COLUMN "skills",
ADD COLUMN     "activeDomainId" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "UserDomain" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "bio" TEXT,
    "experience" INTEGER,
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTalkerConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeTalkerConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTalkerMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeTalkerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IndustryInsightToUserDomain" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_IndustryInsightToUserDomain_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "UserDomain_userId_idx" ON "UserDomain"("userId");

-- CreateIndex
CREATE INDEX "UserDomain_industry_idx" ON "UserDomain"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "UserDomain_userId_industry_key" ON "UserDomain"("userId", "industry");

-- CreateIndex
CREATE INDEX "ResumeTalkerConversation_userId_idx" ON "ResumeTalkerConversation"("userId");

-- CreateIndex
CREATE INDEX "ResumeTalkerConversation_createdAt_idx" ON "ResumeTalkerConversation"("createdAt");

-- CreateIndex
CREATE INDEX "ResumeTalkerMessage_conversationId_idx" ON "ResumeTalkerMessage"("conversationId");

-- CreateIndex
CREATE INDEX "_IndustryInsightToUserDomain_B_index" ON "_IndustryInsightToUserDomain"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeDomainId_fkey" FOREIGN KEY ("activeDomainId") REFERENCES "UserDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDomain" ADD CONSTRAINT "UserDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTalkerConversation" ADD CONSTRAINT "ResumeTalkerConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeTalkerMessage" ADD CONSTRAINT "ResumeTalkerMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ResumeTalkerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IndustryInsightToUserDomain" ADD CONSTRAINT "_IndustryInsightToUserDomain_A_fkey" FOREIGN KEY ("A") REFERENCES "IndustryInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IndustryInsightToUserDomain" ADD CONSTRAINT "_IndustryInsightToUserDomain_B_fkey" FOREIGN KEY ("B") REFERENCES "UserDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
