# Community Phase 1 setup

## What was added
- Real community posts in the database
- Post likes
- Post comments
- New API routes for create/list/like/comment/delete
- Updated `/community` page
- New UI components:
  - `PostComposer`
  - `PostCard`
  - `CommentBox`

## Database step required
Because the Prisma schema changed, run these commands locally:

```bash
npx prisma generate
npx prisma db push
```

If you prefer migrations:

```bash
npx prisma generate
npx prisma migrate dev --name community_phase_1
```

## New API routes
- `GET /api/community/posts`
- `POST /api/community/posts/create`
- `POST /api/community/posts/like`
- `POST /api/community/posts/comments`
- `DELETE /api/community/posts/delete`

## Notes
- Only logged in users can create posts, like, and comment
- Users cannot like their own posts
- Users can delete only their own posts
- Feed currently loads the latest 20 posts
- Each post currently loads up to 10 comments
