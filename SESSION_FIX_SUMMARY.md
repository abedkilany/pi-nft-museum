# Session and access fix summary

## What changed
- Stabilized Pi auth bootstrap so a temporary `/api/auth/me` failure no longer wipes the session token immediately.
- Moved the community page to a client-driven bootstrap model using `/api/community/bootstrap`, so community interaction now follows the bearer session instead of server-rendered guest state.
- Preserved existing `admin` / `superadmin` database roles on Pi login when the account is already staff, preventing accidental demotion to `artist_or_trader`.
- Reworked `/admin` access gating to use the authenticated Pi session on the client side, matching the no-cookie session architecture.
- Improved community action messages for expired sessions.

## Important operational note
For full admin access, make sure your Pi account is either:
- already mapped to an `admin` or `superadmin` role in the database, or
- listed in `PI_SUPERADMIN_USERNAMES`, `PI_SUPERADMIN_UIDS`, `PI_ADMIN_USERNAMES`, or `PI_ADMIN_UIDS`.
