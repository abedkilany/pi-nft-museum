This project now runs `prisma generate` automatically after dependency installation via the `postinstall` script in package.json.

Why: Vercel may restore cached node_modules / Prisma client artifacts from an older deployment. Without regeneration, TypeScript can see an outdated Prisma client that does not include new models like CommunityPostComment or CommunityPostLike.
