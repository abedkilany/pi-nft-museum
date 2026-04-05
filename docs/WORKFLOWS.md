# Workflows

## Artwork lifecycle

A simplified artwork path is:

1. creator uploads artwork
2. artwork enters a draft/pending state
3. admin review updates status
4. artwork may move through approval/publication-related states
5. ratings and reactions affect engagement metrics and premium score

Key files:
- `app/api/artworks/create/route.ts`
- `app/api/artworks/resubmit/route.ts`
- `app/api/admin/artworks/update-status/route.ts`
- `lib/artwork-workflow.ts`
- `lib/artwork-status.ts`

## Admin moderation workflow

Admin actions include:
- reviewing artworks
- reopening/rejecting/modifying statuses
- updating users
- handling reports
- managing pages and settings

Key paths:
- `app/admin/*`
- `app/api/admin/*`
- `lib/admin.ts`
- `lib/admin-guard.ts`

## Community workflow

Community features include:
- creating posts
- liking posts
- commenting on posts
- viewing creators and profiles

Key paths:
- `app/community/*`
- `app/api/community/*`
- `lib/community.ts`
- `lib/notifications.ts`

## Follow workflow

Follow/unfollow operations must keep counts aligned with the `Follow` table.

Key files:
- `app/api/profile/follow/route.ts`
- `lib/follows.ts`
- `lib/counter-consistency.ts`

## Rating and reaction workflow

Ratings and reactions affect engagement fields stored on `Artwork`.

Key files:
- `app/api/ratings/submit/route.ts`
- `app/api/reactions/toggle/route.ts`
- `lib/artwork-workflow.ts`
- `lib/counter-consistency.ts`

## Page publishing workflow

Admin-managed pages use `PageStatus`.

Key files:
- `app/api/admin/pages/create/route.ts`
- `app/api/admin/pages/update/route.ts`
- `app/pages/[slug]/page.tsx`
- `lib/pages.ts`
