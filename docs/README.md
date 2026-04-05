# Pi NFT Museum

Pi NFT Museum is a Next.js marketplace prototype for NFT artworks on Pi Network.

## Role model

The project now uses only these roles:

- Visitor
- Artist or Trader
- Admin
- Super Admin

Visitors can browse the site without logging in.
When a user presses **Connect with Pi**, the first successful Pi sign-in creates a local account automatically with the role **Artist or Trader**.
Admin and Super Admin can be bootstrapped from `.env` on the first Pi login, then are managed from the database.

## Pi-only authentication

Copy `.env.example` to `.env` and fill the required values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL=YOURDOMAIN`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_PI_API_KEY`
- `PI_SERVER_API_KEY` (recommended for payment approval/completion)
- `NEXT_PUBLIC_PI_SANDBOX=true` for test mode
- `PI_PAYMENT_TESTNET_ONLY=true` to block non-testnet payments during development

## Environment setup

Copy `.env.example` to `.env` for local development.

Before a production deploy, make sure these values are present in Vercel:

- `DATABASE_URL`
- `APP_SESSION_SECRET` (preferred) or `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PI_API_KEY`

Optional but feature-dependent:

- `PI_SERVER_API_KEY` for payments
- `PINATA_JWT` for IPFS uploads
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` for observability

You can verify required server variables locally with:

```bash
npm run check:env
```

## Optional admin bootstrap

To make your Pi account become an admin automatically on first login, set one of these before signing in. These values are used only when the local user is created for the first time:

- `PI_SUPERADMIN_USERNAMES="your_pi_username"`
- `PI_SUPERADMIN_UIDS="your_pi_uid"`
- `PI_ADMIN_USERNAMES="another_pi_username"`
- `PI_ADMIN_UIDS="another_pi_uid"`

You can separate multiple values with commas.

## Database update

Run:

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

## Run locally


```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Testnet payment

A basic Pi payment flow has been added for experimentation only:

- client-side payment starts with Pi SDK
- server-side approval route: `/api/pi/payments/approve`
- server-side completion route: `/api/pi/payments/complete`
- payment button appears on artwork pages

Keep `NEXT_PUBLIC_PI_SANDBOX=true` and `PI_PAYMENT_TESTNET_ONLY=true` while testing.

## Important behavior changes

- Guests browse as Visitors
- Local registration is disabled
- Local password login is disabled
- Account creation happens automatically on first successful Pi connection
- First connected Pi account role is `Artist or Trader`
- Payment flow is intended for Pi Testnet / Sandbox experimentation only
