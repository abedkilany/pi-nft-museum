-- CreateTable
CREATE TABLE "AppEvent" (
    "id" SERIAL NOT NULL,
    "eventKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "readableSummary" TEXT,
    "source" TEXT,
    "feature" TEXT,
    "route" TEXT,
    "method" TEXT,
    "url" TEXT,
    "component" TEXT,
    "userId" INTEGER,
    "sessionId" TEXT,
    "requestId" TEXT,
    "traceId" TEXT,
    "correlationId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "httpStatus" INTEGER,
    "durationMs" INTEGER,
    "errorName" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "fingerprint" TEXT,
    "tagsJson" JSONB,
    "dataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppEvent" ADD CONSTRAINT "AppEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "AppEvent_createdAt_idx" ON "AppEvent"("createdAt");
CREATE INDEX "AppEvent_userId_idx" ON "AppEvent"("userId");
CREATE INDEX "AppEvent_category_idx" ON "AppEvent"("category");
CREATE INDEX "AppEvent_type_idx" ON "AppEvent"("type");
CREATE INDEX "AppEvent_status_idx" ON "AppEvent"("status");
CREATE INDEX "AppEvent_severity_idx" ON "AppEvent"("severity");
CREATE INDEX "AppEvent_feature_idx" ON "AppEvent"("feature");
CREATE INDEX "AppEvent_route_idx" ON "AppEvent"("route");
CREATE INDEX "AppEvent_requestId_idx" ON "AppEvent"("requestId");
CREATE INDEX "AppEvent_traceId_idx" ON "AppEvent"("traceId");
CREATE INDEX "AppEvent_correlationId_idx" ON "AppEvent"("correlationId");
CREATE INDEX "AppEvent_entityType_entityId_idx" ON "AppEvent"("entityType", "entityId");
