# Session hardening (Pi-only, no cookies)

This version replaces cookie-based or Pi-access-token-as-session flows with:

- Pi access token used only during `/api/auth/pi/login`
- short-lived signed app session token (10 minutes)
- app session stored in memory + `sessionStorage` only
- no `localStorage` for session state
- server-side session verification for every request
- `sessionVersion` and `roleVersion` enforced from the database
- logout revokes the active session family by incrementing `sessionVersion`
- `/admin` now guarded on the server, not in a client layout

Required environment variable:

- `APP_SESSION_SECRET` (32+ chars)
