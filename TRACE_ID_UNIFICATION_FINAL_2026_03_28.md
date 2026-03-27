# Trace ID Unification Final Upgrade — 2026-03-28

This upgrade focuses on one goal: keep a single active client trace across a user journey instead of creating a fresh trace on every important click.

## What changed

- Important client click events now reuse the current active trace instead of starting a new one by default.
- Important form submissions now reuse the current active trace instead of starting a new one by default.
- Logout now reuses the active trace instead of forcing a new trace.

## Expected result

A single journey such as:

- landing on `/`
- auth probes (`/api/auth/me`, `/api/auth/refresh`)
- clicking **Connect with Pi**
- `/api/auth/pi/login`
- `LOGIN_SUCCESS`
- post-login page view (`/admin`)
- account menu interactions
- logout

should now stay under one trace much more consistently, as long as the flow belongs to the same continuous client journey.

## Tradeoff

This intentionally favors stronger end-to-end correlation over aggressively splitting every user interaction into its own trace.
