# Role source cleanup

This build removes the dual-source role decision during Pi login.

## New behavior
- New Pi user: role is assigned once from the Pi bootstrap env mapping.
- Existing Pi user: role is always read from the database.
- Pi login no longer promotes or changes an existing user's role from env.
- Role changes must now come from the database-backed admin flows.

## Source of truth
- **Bootstrap source**: `PI_SUPERADMIN_*` and `PI_ADMIN_*` env values are used only when a Pi user account is created for the first time.
- **Final source of truth**: the database role on the user record.

## Why this is cleaner
- There is now only one runtime authority for permissions after account creation.
- Audit logs remain clear: they still show the bootstrap role hint, but the final resolved role comes from a single place.
- Admin/superadmin access is no longer implicitly altered by deployment env changes on later logins.
