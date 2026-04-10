# Pi Testnet real payment probe

This version adds a **real payment probe** path inside `/api/pi/testnet-relay`.

It is designed to send a **real Stellar-style payment transaction** to Pi Testnet through the official RPC endpoint.

## Important

- This is **not a real NFT mint yet**.
- It is the first step toward real on-chain minting.
- It proves that the app can build, sign, submit, and confirm a **real testnet transaction**.

## Required Vercel environment variables

```env
PI_TESTNET_PROTOTYPE_RELAY_MODE=real
PI_TESTNET_PROTOTYPE_REAL_TX_MODE=payment_probe
PI_TESTNET_RPC_URL=https://rpc.testnet.minepi.com
PI_TESTNET_PROTOTYPE_REAL_SOURCE_SECRET=YOUR_TESTNET_SECRET
PI_TESTNET_PROTOTYPE_REAL_DESTINATION=YOUR_TESTNET_PUBLIC_KEY
PI_TESTNET_PROTOTYPE_REAL_AMOUNT=0.0000001
PI_TESTNET_PROTOTYPE_REAL_CONFIRM_ATTEMPTS=8
PI_TESTNET_PROTOTYPE_REAL_CONFIRM_DELAY_MS=2500
```

`PI_TESTNET_PROTOTYPE_REAL_DESTINATION` can be left empty to send a self-payment probe.

## What happens

When the app calls the relay in `payment_probe` mode:

1. The relay discovers network information from Pi RPC.
2. It loads the source account from the real testnet account.
3. It builds a payment transaction.
4. It signs the transaction with the configured testnet secret.
5. It calls `simulateTransaction`.
6. It calls `sendTransaction`.
7. It polls `getTransaction` for final confirmation.

## Security note

Use **testnet-only** secrets here. Never use this pattern for mainnet or production custody.
