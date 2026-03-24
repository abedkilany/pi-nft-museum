# Phase 3 — Audit, observability, and production monitoring

This package extends the latest project version with stronger operational monitoring and audit coverage.

## Added in this package

- Added audit logging for sensitive admin actions:
  - categories create / update / delete
  - countries create / update
  - pages create / update / delete
  - artwork status update / reopen
  - report moderation updates
  - settings update
  - review window recalculation
  - error status changes
  - system log clearing
- Enriched `/api/health` with:
  - environment
  - tracked event count
  - open error count
- Reused the existing `AuditLog`, `AppEvent`, and `ErrorLog` infrastructure instead of introducing parallel systems.

## Deployment notes

No schema migration is required for this package.

Recommended deployment steps:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

If you deploy through Vercel, make sure production environment variables are already set before redeploying.
