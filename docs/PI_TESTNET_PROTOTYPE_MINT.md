# Pi Testnet Prototype Mint

This project now treats **Testnet Mint** as a pluggable prototype on-chain flow.

## What changed

- `performTestnetMint()` no longer fabricates a successful mint by default.
- A **relay adapter** is now expected for prototype on-chain tests.
- If the relay is not configured, the flow fails clearly unless you explicitly enable local mock mode.

## Environment variables

```bash
PI_TESTNET_RPC_URL=https://rpc.testnet.minepi.com
PI_TESTNET_PROTOTYPE_NETWORK=Pi Testnet
PI_TESTNET_PROTOTYPE_CONTRACT_ADDRESS=pi-testnet-prototype-contract
PI_TESTNET_PROTOTYPE_RELAY_URL=
PI_TESTNET_PROTOTYPE_API_KEY=
PI_TESTNET_PROTOTYPE_ALLOW_MOCK=false
```

## Relay contract adapter

Configure `PI_TESTNET_PROTOTYPE_RELAY_URL` to point to a relay you control.
The relay should:

1. Accept a POST request from this app.
2. Submit a real state-changing transaction to Pi Testnet.
3. Return JSON in this shape:

```json
{
  "network": "Pi Testnet",
  "contractAddress": "your-contract-id",
  "tokenId": "123",
  "txHash": "0xabc",
  "mintReference": "mint-ref-123",
  "submittedAt": "2026-04-10T00:00:00.000Z",
  "confirmedAt": "2026-04-10T00:00:05.000Z"
}
```

## Local fallback

If you only want to test the app workflow locally, set:

```bash
PI_TESTNET_PROTOTYPE_ALLOW_MOCK=true
```

That fallback is **not** a blockchain mint. It only preserves the legacy simulation behavior for development.


## Local relay

This repository now includes a small local relay under `relay/`.

Start it with:

```bash
node relay/server.mjs
```

Then set in the main app `.env`:

```env
PI_TESTNET_PROTOTYPE_RELAY_URL=http://localhost:4010/mint
PI_TESTNET_PROTOTYPE_API_KEY=change-me
PI_TESTNET_PROTOTYPE_ALLOW_MOCK=false
```

The relay has two useful endpoints:

- `GET /health` to verify the relay and Pi Testnet RPC are reachable
- `POST /mint` for the app

Current behavior:
- checks `https://rpc.testnet.minepi.com` using `getHealth`
- returns prototype mint data in relay `mock` mode
- keeps the app honest when relay is missing or disabled


## Vercel deployment

For Vercel deployments, use the built-in relay route instead of a local relay process:

- Relay URL: `/api/pi/testnet-relay`
- Health check: `/api/pi/testnet-relay`
- Recommended base URL: `https://pi-nft-museum.vercel.app`
