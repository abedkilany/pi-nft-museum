# Unified Event Tracking Setup

This version adds a production-style event stream on top of the existing logs.

## What is new

- New database table: `AppEvent`
- New ingestion endpoint: `POST /api/events`
- Automatic client tracking for:
  - page views
  - clicks on buttons, links, and images
  - form submissions
- Existing systems now also feed the unified stream:
  - logger
  - system logs
  - audit logs
  - client errors
- New admin page: `/admin/events`

## Install steps

1. Apply the new Prisma migration.
2. Redeploy the app.
3. Open `/admin/events` and start testing.

## Prisma commands

```bash
npx prisma migrate deploy
npx prisma generate
```

For local development:

```bash
npx prisma migrate dev --name app_events
```

## What you can expect

- `/admin/events` = full activity stream
- `/admin/errors` = errors only
- `/admin/system` = legacy runtime log view

## Notes

- Sensitive fields are redacted before storage.
- The event stream is intentionally broad, so after testing you may later choose to reduce noise for low-value clicks.
