Applied changes in this package:
- IPFS-ready uploads via Pinata when PINATA_JWT is set; local uploads remain available for development fallback.
- Community page now respects community_enabled and shows a Coming soon state when disabled.
- Navigation hides /community when the feature is disabled.
- Added protected maintenance endpoint: POST /api/maintenance/purge-archived
- Health endpoint now returns a minimal payload and can be protected with HEALTHCHECK_SECRET.
- Server-side Pi payments no longer fall back to NEXT_PUBLIC_PI_API_KEY.
- Removed local cleanup from app/layout.tsx.
- Removed local certificate/cache junk files and duplicate PiPaymentButton copy.
- Follow APIs now return 403 while community is disabled.

Your required tasks after unpacking:
1. Add these environment variables in Vercel: PINATA_JWT, PINATA_GATEWAY_URL, HEALTHCHECK_SECRET, MAINTENANCE_API_SECRET.
2. Keep your existing DATABASE_URL and PI_SERVER_API_KEY values.
3. Redeploy on Vercel.
4. Test: upload artwork image, upload profile image, /community while disabled, /api/health, and follow/unfollow.
