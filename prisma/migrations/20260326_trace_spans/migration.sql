-- AlterTable
ALTER TABLE "AppEvent"
ADD COLUMN IF NOT EXISTS "spanId" TEXT,
ADD COLUMN IF NOT EXISTS "parentSpanId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AppEvent_spanId_idx" ON "AppEvent"("spanId");
CREATE INDEX IF NOT EXISTS "AppEvent_parentSpanId_idx" ON "AppEvent"("parentSpanId");
