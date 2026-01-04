/*
  Warnings:

  - A unique constraint covering the columns `[sourceType,sourceId]` on the table `ContextChunk` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ContextChunk_sourceType_sourceId_idx";

-- CreateIndex
CREATE INDEX "ContextChunk_sourceType_idx" ON "ContextChunk"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "ContextChunk_sourceType_sourceId_key" ON "ContextChunk"("sourceType", "sourceId");
