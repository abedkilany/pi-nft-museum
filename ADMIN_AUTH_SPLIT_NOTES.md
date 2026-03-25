Admin auth split applied in this package:

- Pi SDK flow remains for visitor + artist_or_trader user flows.
- Admin area now has a separate cookie-based login at /admin-login.
- New routes:
  - POST /api/admin/auth/login
  - POST /api/admin/auth/logout
  - GET /api/admin/auth/me
- Admin pages now require the dedicated admin cookie session.
- Old admin bridge entry now redirects callers to /admin-login.
- Added script:
  - node scripts/set-superadmin-password.js <username-or-email> <new-password>

Notes:
- I could not run a full Next.js build in this environment because project dependencies were not installed in the container.
- The code changes are included in the packaged archive for your own local test/build cycle.
