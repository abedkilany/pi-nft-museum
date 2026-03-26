# Vercel Environment Setup

## Required variables
- `DATABASE_URL`
- `APP_SESSION_SECRET` (preferred) or `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PI_API_KEY`

## Required only when those features are enabled
- Payments: `PI_SERVER_API_KEY`
- IPFS uploads: `PINATA_JWT`
- Sentry: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
- Internal protected routes: `HEALTHCHECK_SECRET`, `MAINTENANCE_API_SECRET`

## Recommended Vercel commands
- Install: `npm install`
- Build: `npm run build`

## Useful checks
- Local/full build: `npm run check`
- Environment sanity check: `npm run check:env`
