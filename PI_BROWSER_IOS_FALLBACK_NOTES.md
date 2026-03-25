# Pi Browser iOS hybrid auth fallback

This build keeps cookie-based auth for standard browsers and Android Pi Browser, while adding a short-lived bearer fallback for Pi Browser on iOS.

## What changed
- `/api/auth/pi/login` still sets HttpOnly cookies, and now also returns the short-lived app session token plus refresh token in the JSON response.
- The client stores those tokens in `sessionStorage` only when it detects Pi Browser on iOS.
- Authenticated requests automatically attach:
  - `Authorization: Bearer <session token>`
  - `X-Refresh-Token: <refresh token>`
- `/api/auth/refresh` now accepts the refresh token from either the cookie or `X-Refresh-Token` and rotates both tokens.
- `/api/auth/logout` now revokes the refresh session from either the cookie or the fallback header.
- `/api/auth/session-debug` now reports whether auth arrived via cookies or headers.

## Why
Pi Browser on iOS appears not to return auth cookies reliably after login, while Android does. This hybrid flow preserves the safer cookie flow where it works and adds a platform-specific fallback where it does not.

## Important
- The bearer fallback uses the same short-lived app session token already issued by the server.
- The fallback is sessionStorage-based, so it is cleared when the tab/app context ends.
- Refresh rotation remains enabled.
