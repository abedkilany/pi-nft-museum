# Session restore fix

This patch focuses on the bug where login succeeded on the server but some pages still treated the user as signed out.

## What changed
- Removed reliance on in-memory `sessionHint` as the source of truth.
- Made `PiAuthProvider` always try `/api/auth/me` using cookie-based auth when restoring a session.
- Switched `/api/auth/me` restoration calls to use `piApiFetch()` so refresh rotation can recover expired access sessions.
- Updated `piApiFetch()` to attempt `/api/auth/refresh` on any same-origin 401 response and retry once.
- Standardized guard-generated 401 responses to include a `reason` field.

## Expected result
- Refreshing the page should no longer drop the user into guest mode when valid session cookies still exist.
- Routes like `/account`, `/notifications`, `/follows`, and similar cookie-protected pages should recover automatically after access-token expiry.
