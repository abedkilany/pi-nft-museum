# NFT Museum Routes Overview

## Main public pages
- `/` Home
- `/gallery` Public gallery
- `/premium` Premium artworks
- `/community` Community feed
- `/review` Review queue
- `/upload` Upload artwork
- `/notifications` Notifications inbox
- `/privacy-policy`
- `/terms-of-service`

## Member-only pages
- `/profile` Member profile dashboard for the current signed-in user
- `/account` Account settings and personal information
- `/artwork` Private artwork library for the current signed-in user
- `/artwork/[id]` Artwork details. Owner can open any of their artworks. Other users can only open public/premium/sold items.

## Public profile pages
- `/profile/[username]`
- `/profile/[username]/followers`
- `/profile/[username]/following`

## Account management
- `/account`
- `/account/artworks/[id]/edit`

## Admin pages
- `/admin`
- `/admin/artworks`
- `/admin/artworks/rejected`
- `/admin/categories`
- `/admin/countries`
- `/admin/menu`
- `/admin/pages`
- `/admin/reports`
- `/admin/settings`
- `/admin/system`
- `/admin/users`

## Notes
- Use `/profile` for the signed-in member dashboard.
- Use `/account` only for account settings.
- Use `/artwork` for the signed-in user's private artworks list.
- Use `/profile/[username]` for public creator pages.
