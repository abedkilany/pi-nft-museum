# Phase 2: Roles + Permissions

This package upgrades the app from role-only checks to role + permission authorization.

## What changed
- Added a central permission catalog in `lib/permissions.ts`
- Expanded role model to support `moderator` and `reviewer`
- Updated admin/page/API guards to authorize by permission
- Exposed permission snapshot from `/api/auth/me` and `/api/account/summary`
- Updated selected sensitive routes to check permissions instead of raw role strings
- Expanded Prisma seed so roles are mapped to granular permissions

## Important after deployment
Run the seed once so the permission map is written to the database:

```bash
npx prisma db seed
```

If you skip the seed, the app still falls back to built-in permission defaults for existing roles, but the database will not reflect the new model yet.
