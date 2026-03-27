# Phase 4.3 — Counter Consistency

This phase makes counters use a single source of truth and adds a recovery script.

## What changed

- Added `lib/counter-consistency.ts`
- Centralized follow counts via `getFollowCounts`
- Centralized community post counters via `syncCommunityPostCounts`
- Centralized artwork engagement counters via `syncArtworkEngagementCounts`
- Updated mutation routes so counts are re-synced from related tables instead of manual increment/decrement only
- Added `npm run resync:counts` for emergency recovery / backfill

## Authoritative sources

- Follow counts: `Follow` table
- Community post likes/comments: `CommunityPostLike` and `CommunityPostComment`
- Artwork likes/dislikes: `ArtworkReaction`
- Artwork ratings + average: `Rating`

## Why this is safer

Manual `increment` / `decrement` can drift after retries, duplicate requests, partial failures, or old data.
This phase recalculates counters from their relational source after each mutation.

## Recovery command

```bash
npm run resync:counts
```

Use it when importing data, repairing legacy rows, or verifying production consistency.
