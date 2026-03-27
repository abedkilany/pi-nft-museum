# Core systems

## 1. Status / enum system

Application statuses are centralized in `types/enums.ts` and mirror Prisma enums.

### UserStatus
- `ACTIVE`
- `SUSPENDED`
- `PENDING`
- `BANNED`

### ArtworkStatus
- `DRAFT`
- `PENDING`
- `APPROVED`
- `PUBLIC_REVIEW`
- `MINTING`
- `PUBLISHED`
- `PREMIUM`
- `REJECTED`
- `ARCHIVED`
- `HIDDEN`
- `SOLD`

### PageStatus
- `DRAFT`
- `PUBLISHED`
- `HIDDEN`

### Rule
Prefer shared enums in application code instead of free-form strings.

## 2. Counter consistency system

Counter synchronization introduced in phase 4.3 is centered in `lib/counter-consistency.ts`.

### Source-of-truth rules

#### Follows
- Truth source: `Follow` table
- Derived values: follower count, following count
- Supporting logic: `lib/follows.ts`

#### Community post counts
- Truth source for `likesCount`: `CommunityPostLike`
- Truth source for `commentsCount`: `CommunityPostComment`
- Sync helper: `syncCommunityPostCounts`

#### Artwork engagement
- Truth source for `ratingsCount` and `averageRating`: `Rating`
- Truth source for `likesCount` and `dislikesCount`: `ArtworkReaction`
- Sync helper: `syncArtworkEngagementCounts`
- Underlying recalculation path: `lib/artwork-workflow.ts`

### Operational script

```bash
npm run resync:counts
```

Use it when stored counters may have drifted.

## 3. Authentication and session system

Main files:
- `lib/auth.ts`
- `lib/app-session.ts`
- `lib/auth-cookies.ts`
- `lib/pi-auth.ts`
- `lib/pi-browser-auth.ts`
- `lib/pi-session.ts`

### Design goal
- shared cookie/session handling
- same-origin protections
- fallback handling for constrained Pi/iOS environments

## 4. Validation system

Main files:
- `lib/request-validation.ts`
- `lib/validators.ts`
- route-local validation schemas in API handlers

### Rule
Validation should happen before DB writes and before business logic executes.

## 5. Site settings and policy system

Main files:
- `lib/site-settings.ts`
- `lib/site-config.ts`
- `lib/policy.ts`

These files influence moderation, scoring, windows, and runtime behavior.

## 6. Observability and error tracking

Main files:
- `lib/error-tracker.ts`
- `lib/logger.ts`
- `lib/system-log.ts`
- `instrumentation.ts`
- `instrumentation-client.ts`

Use these for production diagnostics and incident review.
