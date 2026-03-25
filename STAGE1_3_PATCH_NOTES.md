# Stage 1.3 Patch Notes

This build focuses on one targeted fix:

- When `/api/auth/me` returns `401` after a successful Pi login and a fallback session token is present,
  the client now promotes the auth mode to `fallback` and retries with bearer auth immediately.
- The same promotion is applied during normal session restore on app load.
- No broad security rollback was added.

Expected effect:
- iPhone / cookie-restricted clients should switch deterministically into bearer fallback.
- Cookie-capable clients should continue to use cookie auth unless fallback is actually needed.
