# Security hardening level 2

This package adds a second hardening layer on top of the earlier fixes.

## Added in this version
- Removed non-HttpOnly auth cookie fallbacks
- Shortened session lifetime from 7 days to 12 hours
- Revalidated session user from the database on every request
- Added same-origin protection for sensitive POST endpoints
- Added stronger rate limiting helpers and applied them to login, comments, reactions, follows, reports, role changes, and admin user updates
- Restricted admin user update endpoint to superadmin only
- Added audit logging for sensitive account and moderation actions
- Changed report-threshold behavior from auto-hide to manual review queue
- Tightened file-signature validation and added PDF signature checks
- Improved CSP and added extra browser isolation headers
- Unified self-service roles to `visitor` and `artist_or_trader`

## Important notes
- The rate limiting is still in-memory. For the strongest production protection on Vercel, move it later to Redis/Upstash.
- The same-origin check is a practical CSRF mitigation without changing the frontend. A token-based CSRF system can be added later if you want an even stricter model.
- Session revocation is now effectively enforced for role/status changes because requests re-read the user from the database.
