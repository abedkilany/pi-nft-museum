# Pi Testnet Vercel Relay

This project now includes an internal relay endpoint for Vercel deployments:

- `GET /api/pi/testnet-relay` -> health/config check
- `POST /api/pi/testnet-relay` -> prototype mint relay

## Recommended Vercel environment variables

```env
NEXT_PUBLIC_APP_URL=https://pi-nft-museum.vercel.app
APP_URL=https://pi-nft-museum.vercel.app
PI_TESTNET_RPC_URL=https://rpc.testnet.minepi.com
PI_TESTNET_PROTOTYPE_RELAY_URL=https://pi-nft-museum.vercel.app/api/pi/testnet-relay
PI_TESTNET_PROTOTYPE_API_KEY=change-me
PI_TESTNET_PROTOTYPE_RELAY_MODE=mock
PI_TESTNET_PROTOTYPE_RELAY_CHECK_RPC=true
PI_TESTNET_PROTOTYPE_ALLOW_MOCK=false
PI_TESTNET_PROTOTYPE_CONTRACT_ADDRESS=pi-testnet-prototype-contract
PI_TESTNET_PROTOTYPE_NETWORK=Pi Testnet
```

## Notes

- `mock` mode is the current prototype path for Vercel testing.
- The endpoint still checks Pi Testnet RPC reachability when `PI_TESTNET_PROTOTYPE_RELAY_CHECK_RPC=true`.
- Later, replace the mock body in `app/api/pi/testnet-relay/route.ts` with real contract/RPC submission logic.
