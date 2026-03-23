# Observability / Error Tracking Setup

This version adds:
- Internal `ErrorLog` database table with deduplicated fingerprints
- Admin error center at `/admin/errors`
- CSV and JSON export for external developers
- Client-side and React error reporting to `/api/client-errors`
- Sentry integration for Next.js server, edge, and browser runtime

## 1) Install dependencies
```bash
npm install
```

## 2) Apply the database change
```bash
npx prisma migrate dev --name observability
# or in production
npx prisma migrate deploy
```

A starter SQL migration is included in:
`prisma/migrations/20260323_observability/migration.sql`

## 3) Set environment variables
Copy values from `.env.example`, especially:
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN`

On Vercel, set the same variables in the project settings.

## 4) Deploy flow
- Push the code to GitHub
- Vercel builds the app
- Vercel uploads source maps through `withSentryConfig`
- Runtime errors appear in:
  - Sentry dashboard
  - `/admin/errors` inside the app
  - `/admin/system` for legacy log lines

## 5) What gets captured
- API and server errors recorded through `logger.error(...)`
- Browser uncaught errors
- Unhandled promise rejections
- React error boundary failures
- Exportable structured error history

## 6) Suggested Sentry project settings
- Enable source maps
- Enable alerts for new issues
- Enable release health
- Keep replay on error only if you want low volume
