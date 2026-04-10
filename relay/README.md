# Pi Testnet Prototype Relay

This relay is a small local service that your app can call at `PI_TESTNET_PROTOTYPE_RELAY_URL`.

It solves one problem: the Next.js app should not talk directly to Pi Testnet RPC for prototype mint execution.

## What it does

- exposes `POST /mint` for the app
- can verify connectivity to `https://rpc.testnet.minepi.com` using `getHealth`
- returns prototype mint data in `mock` mode so you can test the full app flow
- keeps a JSON log at `relay/data/mint-log.json`

## Modes

### `RELAY_MODE=mock`
Returns generated `txHash` and `tokenId` after optionally checking Pi Testnet RPC health.

### `RELAY_MODE=manual`
Rejects mint requests with a clear message. Use this when you want the app to stay honest until you wire a real contract sender.

## Quick start

1. Copy `relay/.env.example` to `relay/.env`
2. Edit `RELAY_API_KEY`
3. Start the relay:

```bash
node relay/server.mjs
```

4. In the main app `.env` set:

```env
PI_TESTNET_PROTOTYPE_RELAY_URL=http://localhost:4010/mint
PI_TESTNET_PROTOTYPE_API_KEY=change-me
PI_TESTNET_PROTOTYPE_ALLOW_MOCK=false
```

5. Test health:

```bash
curl http://localhost:4010/health
```

## Important

This is still a prototype relay. It does **not** deploy or invoke a real NFT contract on Pi Testnet yet, because the contract invocation details are still not fully available in public official docs. It is useful now to:

- remove fake success from the app
- centralize prototype mint execution
- verify live connectivity to Pi Testnet RPC
- prepare the exact place where a real contract sender will be added later
