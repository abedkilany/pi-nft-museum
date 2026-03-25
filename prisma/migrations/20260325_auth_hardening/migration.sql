-- CreateTable
CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "jti" TEXT NOT NULL,
  "refreshTokenHash" TEXT NOT NULL,
  "deviceInfo" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_jti_key" ON "UserSession"("jti");
CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "UserSession_refreshExpiresAt_idx" ON "UserSession"("refreshExpiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'UserSession_userId_fkey'
  ) THEN
    ALTER TABLE "UserSession"
      ADD CONSTRAINT "UserSession_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
