# Pi Testnet real transaction attempt

This project now supports a **real-attempt relay mode** for Pi Testnet.

It does **not** claim that Pi NFT minting is officially standardized yet.
It gives you a controlled way to attempt a real JSON-RPC transaction from the same Vercel app.

## Modes

- `PI_TESTNET_PROTOTYPE_RELAY_MODE=mock`
  - Current safe prototype behavior
- `PI_TESTNET_PROTOTYPE_RELAY_MODE=real`
  - Sends a real JSON-RPC request to `PI_TESTNET_RPC_URL`
- `PI_TESTNET_PROTOTYPE_RELAY_MODE=manual`
  - Disabled sender, useful for diagnostics

## Required env for real mode

```env
PI_TESTNET_PROTOTYPE_RELAY_MODE=real
PI_TESTNET_RPC_URL=https://rpc.testnet.minepi.com
PI_TESTNET_PROTOTYPE_REAL_SUBMIT_METHOD=sendTransaction
PI_TESTNET_PROTOTYPE_REAL_SUBMIT_PARAMS_JSON=["{{SIGNED_TRANSACTION}}"]
PI_TESTNET_PROTOTYPE_REAL_SIGNED_TX=
```

`PI_TESTNET_PROTOTYPE_REAL_SIGNED_TX` must contain the signed transaction payload you want sent to Pi Testnet.

You can also override the signed payload per request by sending `signedTransaction` in the relay POST body.

## Optional confirmation polling

```env
PI_TESTNET_PROTOTYPE_REAL_STATUS_METHOD=getTransaction
PI_TESTNET_PROTOTYPE_REAL_STATUS_PARAMS_JSON=["{{TX_HASH}}"]
PI_TESTNET_PROTOTYPE_REAL_CONFIRM_ATTEMPTS=3
PI_TESTNET_PROTOTYPE_REAL_CONFIRM_DELAY_MS=2500
```

Use these only if the Pi RPC method names and parameter shapes match your actual integration.

## Placeholders supported in JSON templates

- `{{SIGNED_TRANSACTION}}`
- `{{PAYMENT_IDENTIFIER}}`
- `{{PAYMENT_TXID}}`
- `{{ARTWORK_ID}}`
- `{{OWNER_USER_ID}}`
- `{{OWNER_NAME}}`
- `{{CONTRACT_ADDRESS}}`
- `{{NETWORK}}`
- `{{RPC_URL}}`
- `{{TX_HASH}}`
- `{{METADATA_JSON}}`

## Important note

If Pi changes method names or payload structure, update only these env variables.
The app flow, payment flow, and artwork finalization flow can stay unchanged.
