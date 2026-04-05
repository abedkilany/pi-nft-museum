# Running the project

## Requirements

- Node.js 20+
- npm
- Database configured for Prisma

## Install

```bash
npm install
```

The project runs `prisma generate` during `postinstall`.

## Environment

Start from `.env.example` and provide the required values for:
- database connection
- auth/session secrets
- Pi integration values
- any Sentry or observability keys if used in the target environment

Use this check before local or production deployment:

```bash
npm run check:env
```

## Development

```bash
npm run dev
```


```bash
npm run dev
```

## Quality checks

Lint only:

```bash
npm run lint
```

Type-check only:

```bash
npm run typecheck
```

Full verification:

```bash
npm run check
```

This runs:
1. lint
2. TypeScript no-emit type check
3. production build

## Build and production start

```bash
npm run build
npm run start
```

## Database helpers

Seed data:

```bash
npm run seed
```

## Counter maintenance

Recalculate stored counters from source tables:

```bash
npm run resync:counts
```

This script is useful after bulk imports, manual DB edits, or incident recovery.

## Deployment notes

The project is compatible with Vercel. Before deploying:
- confirm environment variables
- confirm Prisma connection works in the target environment
- run `npm run check`
- verify any production-only secrets are present
