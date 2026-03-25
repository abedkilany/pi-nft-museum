# Session Diagnostic + Final Fix Build

## What changed

- Removed the last false-success fallback in `PiAuthProvider`.
  - The client no longer treats `loginPayload.user` as proof of authentication.
  - Login is only considered successful when `/api/auth/me` succeeds with the cookie-backed session.
- Added `/api/auth/session-debug` (debug-only in non-production) to inspect:
  - whether session and refresh cookies reached the server
  - whether the app session token is valid
  - whether the refresh token still exists in the session registry
- Added explicit `reason` values to more auth failures:
  - `/api/auth/refresh`
  - `/api/auth/admin-entry`
- Added small response headers on `/api/auth/pi/login` for easier tracing.

## Expected behavior now

- If cookies are not being stored or sent, login will fail visibly instead of creating a fake logged-in state.
- In development, you can call `/api/auth/session-debug` immediately after login to see whether the server received:
  - `pi_app_session`
  - `pi_refresh_session`

## If the issue still happens

Open `/api/auth/session-debug` in the same browser session right after login and inspect:

- `cookieHeaderPresent`
- `cookieNamesSeen`
- `sessionPresent`
- `refreshPresent`
- `sessionStatus`
- `refreshStatus`

That will tell you whether the remaining problem is:

1. cookie write failure
2. cookie send failure
3. session token validation failure
4. refresh registry mismatch
