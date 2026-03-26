# Auth hardening changes in this build

## Included
- App session moved to **HttpOnly cookies**.
- Added **refresh token rotation** endpoint: `/api/auth/refresh`.
- Added **session registry** via `UserSession` Prisma model.
- Admin bridge uses a dedicated **HttpOnly cookie** only.
- Added basic centralized **policy layer** in `lib/policy.ts`.
- Kept bearer-token compatibility where possible, but browser flow now uses cookies by default.

## Before testing
1. Run Prisma migration for the new `UserSession` table.
2. Run `prisma generate`.
3. Restart the app.

## New files
- `lib/auth-cookies.ts`
- `lib/session-registry.ts`
- `lib/policy.ts`
- `app/api/auth/refresh/route.ts`
- `prisma/migrations/20260325_auth_hardening/migration.sql`

## Main edited files
- `app/api/auth/pi/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/admin-entry/route.ts`
- `lib/app-session.ts`
- `lib/bearer-auth.ts`
- `lib/pi-auth-client.ts`
- `components/auth/PiAuthProvider.tsx`
- `components/auth/AdminPageLink.tsx`
- `components/PiConnectButton.tsx`
- `prisma/schema.prisma`
