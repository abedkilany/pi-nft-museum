# Pi Browser login fixes

## What was changed
- Unified Pi token storage around `pi_access_token`.
- Updated both login components to use `setPiAuthToken(...)` instead of writing `pi_token` manually.
- Stopped redirecting users to `/admin` immediately after Pi login. The login flow now redirects to `/account`, which already loads through authenticated client API calls.
- Converted the top navigation auth state to client-side verification through `/api/auth/me`, so Pi Browser users stay visibly signed in after page transitions.
- Simplified logout to clear the Pi token on the client first.

## Important note
This package is now better aligned with Pi Browser's no-cookie / iframe flow.

However, some admin pages are still rendered server-side from Prisma directly. That means the login persistence issue is improved, but **admin protection still needs a second pass** if you want full Pi-Browser-native protection without cookies.
