# Trace Phase 1 + 2 Implementation Notes

This package contains a new observability/tracing foundation focused on:

1. **Phase 1 — unify logging**
   - deprecated `/api/track` now forwards into `AppEvent`
   - middleware no longer posts noisy request events to `Event`
   - legacy client trackers now send structured events to `/api/events`
   - `TrackingInit` is now a no-op to avoid double tracking

2. **Phase 2 — add trace/span support**
   - `AppEvent` now includes `spanId` and `parentSpanId`
   - middleware injects `x-trace-id`, `x-request-id`, and `x-session-id`
   - client fetch calls are auto-instrumented with request spans
   - server request tracing helper added via `lib/server-trace.ts`
   - Prisma queries are traced automatically when a request trace context exists
   - critical flows instrumented:
     - `POST /api/auth/pi/login`
     - `POST /api/artworks/create`

## Required after install

Run these commands locally after extracting the project:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
# or, in development:
# npx prisma migrate dev
npm run dev
```

## Database change

A new migration was added:
- `prisma/migrations/20260326_trace_spans/migration.sql`

It adds:
- `AppEvent.spanId`
- `AppEvent.parentSpanId`

## What you can inspect now

For a traced action such as login or artwork creation, you should now see related `AppEvent` records sharing the same `traceId`, with nested `spanId` / `parentSpanId` relationships for:
- user interaction / request start
- client API request
- server request
- Prisma DB query spans
- request completion / failure

