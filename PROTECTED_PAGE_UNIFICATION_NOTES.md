Protected-page unification changes in this build:

- Added a shared ProtectedPageGate component for client-protected pages.
- Unified RequirePiAuth and AdminAccessGate on top of the same gate logic.
- Added a unified current-user resolver entry point in lib/current-user.ts.
- Added /api/auth/page-session to sync server-readable cookies and optional admin bridge from token-first sessions.
- Updated AdminPageLink to pre-sync page/session state before opening /admin.
- Updated PiAuthProvider to sync server-page session state after token-first authentication and session restore.
- Updated /api/auth/admin-entry to refresh session cookies when bearer + refresh headers are present.
