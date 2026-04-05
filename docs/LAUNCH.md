# Launch checklist

## Before deployment

1. Run:

```bash
npm run check
```

2. Confirm required environment variables are set.
3. Confirm Prisma can connect in the target environment.
4. Confirm admin credentials and operational secrets are present.
5. Confirm key user flows on staging or preview deployment:
   - login
   - upload artwork
   - artwork review/update status
   - follow/unfollow
   - community likes/comments
   - rating/reaction updates

## After deployment

Monitor these areas first:
- login/session behavior
- admin moderation actions
- artwork creation and review
- counter correctness for follows, comments, likes, and ratings
- unexpected 4xx/5xx responses

## Recommended smoke tests

- register/login works
- session persists correctly
- admin can load dashboard
- artwork can be submitted and reviewed
- counts update after follows/likes/comments/ratings
- public pages and profiles render correctly

## Maintenance operations

### Re-sync counters

```bash
npm run resync:counts
```

Use after incidents, DB edits, or suspected counter drift.

## Safe-change guidance

Be careful when changing:
- enum values
- auth/session code
- moderation status transitions
- stored counter update logic
- Prisma schema affecting `User`, `Artwork`, `Follow`, `CommunityPost`, `Rating`, or `ArtworkReaction`

## Current known non-blockers

Warnings such as unused variables or `<img>` optimization warnings may still exist. They do not necessarily block deployment, but they should be cleaned up gradually for long-term maintainability.
