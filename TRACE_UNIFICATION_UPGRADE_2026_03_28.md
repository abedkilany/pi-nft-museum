# Trace Unification Upgrade — 2026-03-28

This upgrade improves observability in three areas:

1. Better linking across client click -> auth flow -> server login -> redirect page view
2. Unified trace reuse instead of spawning a new trace in the Pi connect flow
3. More precise classification for expected pre-auth refresh and auth probe events

## Main changes

- Reused the active client trace in `PiConnectButton` and `PiAuthProvider` so the Connect with Pi click, auth flow events, and `/api/auth/pi/login` can stay on the same trace.
- Reused the active trace for page-view logging so the post-login redirect page view can stay attached to the login flow when appropriate.
- Classified expected unauthenticated `/api/auth/me` and `/api/auth/refresh` 401 responses as `AUTH_STATE` with low severity instead of treating them like generic anomalies.
- Marked server refresh warnings like `AUTH_REFRESH_MISSING_COOKIE` and `AUTH_REFRESH_TOKEN_NOT_ACTIVE` as `auth_state` to lower noise and improve operational meaning.

## Expected result

For the Pi login journey you should now see a tighter chain like:

- `PI_CONNECT_BUTTON_CLICKED`
- `PI_CONNECT_BUTTON_AUTH_ATTEMPT`
- Pi auth debug / client auth events
- `/api/auth/pi/login` server logs
- `LOGIN_SUCCESS` audit/app event
- redirect page view on the destination page

with the same or substantially more consistent trace linkage.
