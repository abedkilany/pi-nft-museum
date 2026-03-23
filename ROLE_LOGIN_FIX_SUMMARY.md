# Role preservation fix

This build fixes Pi login so an existing user is no longer downgraded on every login.

## New behavior
- New Pi user: role is assigned from `resolvePiRole()` as before.
- Existing Pi user: current database role is preserved by default.
- Existing Pi user can still be **promoted** from env-based Pi admin/superadmin lists.
- Existing Pi user is never automatically downgraded to `artist_or_trader` during login.

## Why the bug happened
The login route previously recalculated the role from Pi env on every login and always wrote that role back to the user row. If the Pi username/uid was not matched in env, `resolvePiRole()` returned `artist_or_trader`, overwriting `superadmin` or `admin`.
