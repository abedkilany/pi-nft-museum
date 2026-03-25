# Stage 1.4 Diagnostic Build

This build adds focused client-side auth diagnostics without changing core auth behavior.

Added tracing around:
- login response fallback payload
- sessionStorage/memory auth snapshot after login
- auth mode promotion to fallback
- /api/auth/me request and response
- /api/auth/refresh request, headers, response, and clear-token reasons
- token clear events with reason

Use this build to identify whether iOS is failing at:
1. receiving fallback payload
2. persisting fallback state
3. attaching Authorization/X-Refresh-Token on subsequent requests
