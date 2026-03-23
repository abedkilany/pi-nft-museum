This package applies a client-auth-first session model to the app.

Main changes:
- PiAuthProvider no longer clears the session aggressively on any temporary failure.
- piApiFetch no longer wipes the token automatically on every 401.
- Community now loads user-aware state through client-side bootstrap endpoints instead of server render auth.
- Gallery, Premium, and Review pages no longer depend on server-side current-user detection for interaction state.
- Admin layout now uses a client-side access gate instead of server-side requireAdminPage.
- Added /api/community/bootstrap for current-user community state.

Important limitation:
- This keeps API authorization on the server, but admin pages themselves are now gated on the client to match the no-cookies architecture.
