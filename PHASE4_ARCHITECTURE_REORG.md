# Phase 4.1 — Architecture Reorganization

This update introduces a domain-oriented structure while preserving backward compatibility.

## New barrels
- `lib/domains/auth`
- `lib/domains/admin`
- `lib/domains/artworks`
- `lib/domains/community`
- `lib/domains/engagement`
- `lib/domains/notifications`
- `lib/domains/pi`
- `lib/domains/system`

## New service barrels
- `lib/services/request`
- `lib/services/content`
- `lib/services/users`

## Migration policy
Existing imports from `lib/*` continue to work. New code should prefer the new domain/service barrels.

## Goal
Move the codebase gradually from file-by-file utilities toward domain and service boundaries without breaking production behavior.
