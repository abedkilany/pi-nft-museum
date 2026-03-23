# Session hardening applied

This build includes a production-oriented hybrid session flow for Pi Browser and Sandbox.

## What changed

- Server session cookie remains the primary auth mechanism.
- Pi access token is kept only as a fallback for Pi Browser / WebView quirks.
- `/api/auth/me` now rehydrates the signed server session automatically when bearer auth succeeds but the server cookie is missing.
- Server-side user resolution now checks, in order:
  1. signed auth cookie
  2. Authorization header
  3. Pi fallback hint cookie
- Login now sets both:
  - signed HttpOnly session cookie
  - short-lived client-readable fallback hint cookie
- Logout clears both cookies and the client token.
- Admin pages remain protected on the server.

## Expected behavior

- Sandbox may auto-authenticate more smoothly.
- Pi Browser may still show the Connect button on first open. That is acceptable.
- Once logged in, Pi Browser should remain authenticated more reliably across page changes and refreshes.

## Important env vars

Make sure these are set in production:

- `AUTH_SECRET`
- `PI_API_KEY`
- `PI_SERVER_WALLET_SECRET`
- database variables already used by the project

## After deployment

Before testing on Pi Browser:

1. Clear site data for the app if possible.
2. Log in once with Connect with Pi.
3. Visit `/admin`.
4. Refresh the page.
5. Navigate across a few pages and confirm auth remains stable.
