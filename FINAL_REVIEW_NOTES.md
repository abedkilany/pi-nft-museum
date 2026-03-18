# Final stabilization pass

Applied in this package:
- Added production-ready storage adapter with Vercel Blob support and local fallback for development.
- Community page and follow APIs now respect `community_enabled`.
- Navigation now hides Community when disabled.
- Removed filesystem purge job from root layout and added a protected maintenance endpoint instead.
- Tightened Pi payment server key handling to server-only secrets.
- Reduced `/api/health` output and added optional secret protection.
- Updated `.env.example` for PostgreSQL/Neon and storage secrets.
- Cleaned duplicate/local-only files from the repository snapshot.
- Updated package.json to a patched Next.js 14.x release line and added `@vercel/blob`.
- Adjusted TypeScript config and declarations so `npm run typecheck` passes in this offline review environment.

Remaining intentional limitation:
- The Mint button/flow was left as-is functionally, per your note that it is still experimental.
