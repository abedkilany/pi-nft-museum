# Architecture

## Project structure

The application is a Next.js App Router project backed by Prisma.

- `app/`: routes, pages, and API endpoints.
- `components/`: reusable UI grouped by feature.
- `lib/`: application logic, policies, guards, helpers, and shared workflows.
- `lib/domains/`: domain-oriented code introduced during phase 4.1.
- `lib/services/`: service-style orchestration and shared business operations.
- `prisma/`: schema, migrations, and seed logic.
- `types/`: shared TypeScript types and central enums.
- `public/`: static assets and placeholders.
- `scripts/`: maintenance and operational scripts.

## High-level request flow

1. A page or client component calls an API route in `app/api/...`.
2. The route validates input through helpers in `lib/request-validation.ts`, `lib/validators.ts`, and route-level schemas.
3. Authentication and access control are enforced through `lib/auth.ts`, `lib/app-session.ts`, `lib/admin-guard.ts`, `lib/security.ts`, and related helpers.
4. Business rules are executed inside `lib/*`, especially workflow-oriented files such as `lib/artwork-workflow.ts`, `lib/follows.ts`, `lib/community.ts`, and `lib/pages.ts`.
5. Data persistence goes through Prisma via `lib/prisma.ts`.
6. Responses are serialized back to the client.

## Main functional areas

### Authentication and sessions
- Cookie and session handling lives in `lib/app-session.ts`, `lib/auth-cookies.ts`, and `lib/auth.ts`.
- Pi-specific login helpers live in `lib/pi-auth.ts`, `lib/pi-browser-auth.ts`, and `lib/pi-session.ts`.
- Guards such as `assertSameOrigin` and admin/session checks are part of the security hardening work from phase 1.

### Artwork domain
- Artwork submission, status changes, premium score, and engagement recalculation are centered around `lib/artwork-workflow.ts`.
- Supporting files include `lib/artwork-status.ts`, `lib/artwork-detail.ts`, `lib/artwork-archive.ts`, and `lib/timeToPremium.ts`.
- Routes under `app/api/artworks/*`, `app/review/*`, `app/gallery/*`, and `app/artwork/[id]/*` consume this logic.

### Admin domain
- Admin pages and routes live under `app/admin/*` and `app/api/admin/*`.
- Shared admin helpers live in `lib/admin.ts`, `lib/admin-guard.ts`, and `lib/admin-bridge.ts`.

### Community domain
- Community pages and interactions live under `app/community/*` and `app/api/community/*`.
- Follow, like, comment, and feed-related helpers live in `lib/community.ts`, `lib/follows.ts`, and `lib/notifications.ts`.

### CMS / pages
- Public pages are stored with Prisma `Page` records.
- Supporting logic is in `lib/pages.ts` and routes under `app/pages/[slug]` and `app/api/admin/pages/*`.

## Data model anchors

The most important Prisma models for runtime behavior are:
- `User`
- `UserSession`
- `Follow`
- `Artwork`
- `Rating`
- `ArtworkReaction`
- `ArtworkComment`
- `ArtworkReport`
- `Page`
- `CommunityPost`
- `CommunityPostLike`
- `CommunityPostComment`

## Shared enums

Central enums are defined in `types/enums.ts` and mirror Prisma enums:
- `UserStatus`
- `ArtworkStatus`
- `PageStatus`

These enums are now the preferred source for application-level status references.

## Architecture rules going forward

1. New business rules should go into `lib/` and not directly into route handlers.
2. API routes should stay thin: validate, authorize, call domain logic, return response.
3. Status values should always use shared enums instead of raw strings when possible.
4. Counter-like values should follow the consistency rules documented in `SYSTEMS.md`.
5. Any new operational script should go under `scripts/` and be documented in `RUNNING.md` or `LAUNCH.md`.
