# Community 2.0 setup

This package adds three main upgrades:

- smarter community feed ranking (`Top` and `Latest` modes)
- artwork-linked posts in the composer and feed
- improved creator ranking + profile community posts section

## Required database update

A new optional relation was added on `CommunityPost`:

- `artworkId`

Run one of these before deploying:

```bash
npx prisma generate
npx prisma db push
```

Or with migrations:

```bash
npx prisma generate
npx prisma migrate dev --name community_2_0
```

## Notes

- Community API routes are forced dynamic to avoid build-time database issues.
- A creator can only attach one of **their own** artworks to a post.
- The Active Creators panel still shows only **6 users**, but now ranks them by a clearer score.
