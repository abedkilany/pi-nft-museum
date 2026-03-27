-- Phase 1: dedicated system log storage
CREATE TABLE IF NOT EXISTS "SystemLog" (
  "id" SERIAL NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "code" TEXT,
  "category" TEXT,
  "severity" TEXT,
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
  "httpStatus" INTEGER,
  "fingerprint" TEXT,
  "dataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SystemLog_userId_fkey'
  ) THEN
    ALTER TABLE "SystemLog"
      ADD CONSTRAINT "SystemLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "SystemLog_timestamp_idx" ON "SystemLog"("timestamp");
CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX IF NOT EXISTS "SystemLog_category_idx" ON "SystemLog"("category");
CREATE INDEX IF NOT EXISTS "SystemLog_severity_idx" ON "SystemLog"("severity");
CREATE INDEX IF NOT EXISTS "SystemLog_feature_idx" ON "SystemLog"("feature");
CREATE INDEX IF NOT EXISTS "SystemLog_userId_idx" ON "SystemLog"("userId");
CREATE INDEX IF NOT EXISTS "SystemLog_requestId_idx" ON "SystemLog"("requestId");
CREATE INDEX IF NOT EXISTS "SystemLog_traceId_idx" ON "SystemLog"("traceId");
CREATE INDEX IF NOT EXISTS "SystemLog_correlationId_idx" ON "SystemLog"("correlationId");
CREATE INDEX IF NOT EXISTS "SystemLog_entityType_entityId_idx" ON "SystemLog"("entityType", "entityId");

-- Phase 2: stronger traceability for errors and sessions
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "isOperational" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "traceId" TEXT;
ALTER TABLE "ErrorLog" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;

CREATE INDEX IF NOT EXISTS "ErrorLog_requestId_idx" ON "ErrorLog"("requestId");
CREATE INDEX IF NOT EXISTS "ErrorLog_traceId_idx" ON "ErrorLog"("traceId");
CREATE INDEX IF NOT EXISTS "ErrorLog_correlationId_idx" ON "ErrorLog"("correlationId");
CREATE INDEX IF NOT EXISTS "ErrorLog_sessionId_idx" ON "ErrorLog"("sessionId");
CREATE INDEX IF NOT EXISTS "ErrorLog_category_idx" ON "ErrorLog"("category");

ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastRoute" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastRequestId" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastTraceId" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastCorrelationId" TEXT;
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS "lastActivityType" TEXT;

-- Backfill legacy system logs from AuditLog once, preserving old records.
INSERT INTO "SystemLog" (
  "timestamp", "level", "message", "code", "category", "severity", "source", "feature",
  "route", "method", "url", "component", "userId", "sessionId", "requestId", "traceId",
  "correlationId", "entityType", "entityId", "httpStatus", "fingerprint", "dataJson", "createdAt"
)
SELECT
  COALESCE(("newValuesJson"->>'timestamp')::timestamp, "createdAt") AS "timestamp",
  COALESCE(NULLIF("newValuesJson"->>'level', ''), lower(replace("action", 'SYSTEM_LOG_', ''))) AS "level",
  COALESCE(NULLIF("newValuesJson"->>'message', ''), "action") AS "message",
  NULLIF("newValuesJson"->>'code', '') AS "code",
  NULLIF("newValuesJson"->>'category', '') AS "category",
  NULLIF("newValuesJson"->>'severity', '') AS "severity",
  NULLIF("newValuesJson"->>'source', '') AS "source",
  NULLIF("newValuesJson"->>'feature', '') AS "feature",
  NULLIF("newValuesJson"->>'route', '') AS "route",
  NULLIF("newValuesJson"->>'method', '') AS "method",
  NULLIF("newValuesJson"->>'url', '') AS "url",
  NULLIF("newValuesJson"->>'component', '') AS "component",
  CASE WHEN ("newValuesJson"->>'userId') ~ '^[0-9]+$' THEN ("newValuesJson"->>'userId')::integer ELSE NULL END AS "userId",
  NULLIF("newValuesJson"->>'sessionId', '') AS "sessionId",
  NULLIF("newValuesJson"->>'requestId', '') AS "requestId",
  NULLIF("newValuesJson"->>'traceId', '') AS "traceId",
  NULLIF("newValuesJson"->>'correlationId', '') AS "correlationId",
  NULLIF("newValuesJson"->>'entityType', '') AS "entityType",
  NULLIF("newValuesJson"->>'entityId', '') AS "entityId",
  CASE WHEN ("newValuesJson"->>'httpStatus') ~ '^[0-9]+$' THEN ("newValuesJson"->>'httpStatus')::integer ELSE NULL END AS "httpStatus",
  NULLIF("newValuesJson"->>'fingerprint', '') AS "fingerprint",
  COALESCE("newValuesJson"->'meta', '{}'::jsonb) AS "dataJson",
  "createdAt"
FROM "AuditLog"
WHERE "targetType" = 'SYSTEM'
  AND "action" LIKE 'SYSTEM_LOG_%'
  AND NOT EXISTS (
    SELECT 1
    FROM "SystemLog" s
    WHERE s."timestamp" = COALESCE(("AuditLog"."newValuesJson"->>'timestamp')::timestamp, "AuditLog"."createdAt")
      AND s."message" = COALESCE(NULLIF("AuditLog"."newValuesJson"->>'message', ''), "AuditLog"."action")
  );
