# iOS hybrid auth fix

This build fixes the main gap in the previous iOS Pi Browser fallback flow.

## What was wrong
The login route was issuing cookies correctly, but it did not include `session.token` and `session.refreshToken` in the JSON response.
The client-side iOS fallback logic depends on those values to send:
- `Authorization: Bearer <session token>`
- `X-Refresh-Token: <refresh token>`

Because those fields were missing, the iOS fallback path never actually sent auth headers.

## What changed
- `/api/auth/pi/login` now returns:
  - `session.token`
  - `session.refreshToken`
  - `session.transport`
- Added `X-Auth-Transport` response header for easier diagnostics
- Tightened the client flow so iOS Pi Browser throws a clear error if fallback tokens are missing instead of silently proceeding

## Expected result
- Android / desktop can continue using cookies
- iOS Pi Browser can fall back to header-based auth when cookies are not persisted
