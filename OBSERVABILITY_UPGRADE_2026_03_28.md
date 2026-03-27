# Observability upgrade — 2026-03-28

This package upgrades the app's observability stack in four phases.

## What changed

### Phase 1 — Clear storage boundaries
- Added a dedicated `SystemLog` table.
- Kept `AuditLog` for audit activity only.
- Preserved legacy compatibility by letting `lib/system-log.ts` read old `AuditLog`-based system logs if the new table is not present yet.

### Phase 2 — Better traceability
- Added richer trace fields to `ErrorLog`:
  - `category`
  - `isOperational`
  - `sessionId`
  - `traceId`
  - `correlationId`
- Added richer activity snapshot fields to `UserSession`:
  - `lastRoute`
  - `lastRequestId`
  - `lastTraceId`
  - `lastCorrelationId`
  - `lastActivityType`

### Phase 3 — Structured system logging
- Reworked `lib/logger.ts` so every log becomes a structured `SystemLogEntry`.
- Reworked `lib/system-log.ts` to persist structured fields such as:
  - level
  - message
  - code
  - category
  - severity
  - source
  - route
  - method
  - userId
  - sessionId
  - requestId
  - traceId
  - correlationId
  - entity context
  - httpStatus

### Phase 4 — Noise control and retention
- Added retention cleanup logic in `cleanupSystemLogs()`.
- Improved error severity mapping for `security` and `payments` categories.
- Kept `ErrorLog` as the source of truth for operational failures.

## Files changed
- `prisma/schema.prisma`
- `prisma/migrations/20260328_observability_upgrade/migration.sql`
- `lib/system-log.ts`
- `lib/logger.ts`
- `lib/error-tracker.ts`
- `lib/session-registry.ts`

## Before you run the app
Apply the new Prisma migration:

```bash
npx prisma migrate deploy
```

If you are working locally and want a regenerated client too:

```bash
npx prisma generate
```

## Notes
- The upgrade keeps legacy `AuditLog`-based system logs readable.
- New logs now write to `SystemLog` first.
- The old audit-based system logs are backfilled into `SystemLog` by the migration.
