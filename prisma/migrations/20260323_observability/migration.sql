-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ErrorSource" AS ENUM ('API', 'SERVER', 'CLIENT', 'REACT', 'MIDDLEWARE', 'CRON', 'UNKNOWN');

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" SERIAL NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readableSummary" TEXT,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ErrorStatus" NOT NULL DEFAULT 'OPEN',
    "source" "ErrorSource" NOT NULL DEFAULT 'UNKNOWN',
    "runtime" TEXT,
    "route" TEXT,
    "method" TEXT,
    "url" TEXT,
    "digest" TEXT,
    "errorName" TEXT,
    "stack" TEXT,
    "componentStack" TEXT,
    "code" TEXT,
    "httpStatus" INTEGER,
    "release" TEXT,
    "environment" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "ignoredAt" TIMESTAMP(3),
    "sentryEventId" TEXT,
    "sentryIssueUrl" TEXT,
    "tagsJson" JSONB,
    "extraJson" JSONB,
    "lastPayloadJson" JSONB,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorLog_fingerprint_key" ON "ErrorLog"("fingerprint");
CREATE INDEX "ErrorLog_status_idx" ON "ErrorLog"("status");
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");
CREATE INDEX "ErrorLog_source_idx" ON "ErrorLog"("source");
CREATE INDEX "ErrorLog_lastSeenAt_idx" ON "ErrorLog"("lastSeenAt");
CREATE INDEX "ErrorLog_userId_idx" ON "ErrorLog"("userId");

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
