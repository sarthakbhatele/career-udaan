-- CreateTable
CREATE TABLE "RAGOutput" (
    "id" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "domainId" TEXT,
    "userId" TEXT,
    "content" JSONB NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RAGOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContextChunk" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContextChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RAGOutput_taskType_domainId_idx" ON "RAGOutput"("taskType", "domainId");

-- CreateIndex
CREATE INDEX "RAGOutput_userId_idx" ON "RAGOutput"("userId");

-- CreateIndex
CREATE INDEX "RAGOutput_expiresAt_idx" ON "RAGOutput"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RAGOutput_taskType_taskKey_key" ON "RAGOutput"("taskType", "taskKey");

-- CreateIndex
CREATE INDEX "ContextChunk_sourceType_sourceId_idx" ON "ContextChunk"("sourceType", "sourceId");
