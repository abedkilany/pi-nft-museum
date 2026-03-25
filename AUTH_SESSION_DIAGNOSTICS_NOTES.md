# Auth session diagnostics build

Changes in this build:
- Added server-side cookie diagnostics to `/api/auth/pi/login`, `/api/auth/me`, and `/api/auth/refresh`.
- Made `/api/auth/session-debug` available in production-safe form so the browser can inspect whether auth cookies reached the server.
- Added post-login session restore retries in the client before failing.
- Replaced the misleading Pi Browser alert with a clearer app-session failure message when available.

Primary log events to inspect:
- `PI_LOGIN_ROUTE_COOKIES_SET`
- `AUTH_ME_START`
- `AUTH_REFRESH_START`
- `AUTH_REFRESH_MISSING_COOKIE`
- `AUTH_SESSION_DEBUG_REQUESTED`
- `PI_AUTH_SESSION_RESTORE_RETRY_RESULT`
- `PI_AUTH_SESSION_RESTORE_RECOVERED_AFTER_RETRY`
