Stage 1 patch applied:
- Removed token exposure from Pi login and refresh responses.
- Removed admin_grant query bridge from middleware.
- Restricted /api/auth/session-debug outside production and reduced exposed data.
- Removed X-Refresh-Token fallback from refresh/logout.
- Switched client auth helper to cookie-only transport.
- Added lib/safe-response.ts and updated matching API routes to avoid raw internal errors in production.
