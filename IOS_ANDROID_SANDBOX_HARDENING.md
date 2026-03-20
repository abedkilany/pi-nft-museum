# iOS / Android / Sandbox hardening

This patch focuses on the most fragile cross-environment issues:

- Client auth token is now stored in both sessionStorage and localStorage.
- `piApiFetch()` now retries 401 API requests after trying `/api/auth/me` and `/api/auth/bootstrap`.
- Middleware no longer redirects API requests, preventing broken POST/DELETE flows.
- Review and gallery interaction widgets can self-recover auth on the client.
- Private client pages (`/account`, `/profile`, `/artwork`) redirect to `/login` on confirmed 401.
- Notification actions and admin page save actions now use the Pi-aware fetch helper.
- `My Artworks` layout was softened for smaller screens.

Recommended smoke test after deploy:

1. Sandbox: login, profile, artwork, review submit, gallery reactions.
2. Pi Browser Android: same flow plus logout/login again.
3. Pi Browser iOS: login, profile, artwork, review submit, notifications.
