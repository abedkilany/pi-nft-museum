# Stage 1.2 Patch Notes

This build focuses on stabilizing the hybrid auth flow without rolling back the stage 1 security hardening.

## Changes
- Added deterministic client auth modes: `cookie`, `hybrid`, `fallback`.
- Added in-memory auth fallback alongside `sessionStorage` so Pi Browser / embedded clients can keep tokens even if storage is unreliable.
- Stopped attaching bearer headers in cookie/hybrid mode by default.
- Hybrid mode now upgrades to fallback mode after a successful refresh through the header-based path.
- Refresh failures no longer wipe fallback tokens on the first generic `401`.
- Client keeps fallback state during transient unauthorized responses instead of self-erasing immediately.
- Post-login session restore now records the auth source and upgrades to `fallback` when bearer auth is what actually restored the session.

## Expected outcome
- Android should continue working.
- iPhone Pi Browser should have a stronger chance to recover through fallback mode.
- Firefox/sandbox should avoid the previous self-erasing loop after the first `401`.
