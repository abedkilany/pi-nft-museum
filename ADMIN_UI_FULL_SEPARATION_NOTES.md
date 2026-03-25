This build completes the missing UI split for admin routes.

Changes:
- Admin routes and /admin-login no longer mount PiScript, PiAuthProvider, or the public NavBar.
- Admin client actions now use the admin cookie session instead of the Pi bearer-token helper.
- Admin sidebar is driven by the authenticated admin session and filtered by effective permissions.

Expected result:
- No Connect with Pi button inside /admin or /admin-login.
- Admin pages no longer behave like visitor pages.
- Client-side admin actions use the dedicated admin session cookie.
