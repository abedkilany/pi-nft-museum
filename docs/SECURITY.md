# Security

## Authentication transport policy

The application uses a cookie-first authentication model.

- Default transport: `cookie-session`
- Compatibility fallback: `pi-browser-bearer-fallback`
- Privileged admin transport: `admin-bridge`

## Fallback scope

Bearer fallback exists only for compatibility with Pi Browser on iOS, where third-party cookie return can fail during login/session restoration.

Rules:

- Fallback is allowed for non-admin flows only.
- Admin pages and admin APIs remain secure-session only.
- Admin entry requires a secure cookie-backed session before issuing an admin handoff.
- Session validation, role validation, and session version checks remain identical across transports.

## Session model

- Short-lived app session token
- Rotating refresh session
- Database-backed session invalidation via session version and role version
- Admin bridge isolated from general user transport
