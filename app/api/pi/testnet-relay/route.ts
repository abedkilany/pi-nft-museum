import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAppBaseUrl, getBooleanEnv, getEnv } from '@/lib/env';

const DEFAULT_RPC_URL = 'https://rpc.testnet.minepi.com';
const DEFAULT_NETWORK = 'Pi Testnet';
const DEFAULT_CONTRACT = 'pi-testnet-prototype-contract';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type RelayBody = Record<string, unknown>;

type RelayConfig = ReturnType<typeof getRelayConfig>;

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization')?.trim() || '';
  if (!header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized relay request.' }, { status: 401 });
}

function buildTxHash(seed: string) {
  return `0x${crypto.createHash('sha256').update(seed).digest('hex')}`;
}

function buildTokenId(artworkId: number) {
  return `${artworkId}-${Date.now()}`;
}

async function rpcHealth(rpcUrl: string) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function getRelayConfig() {
  return {
    apiKey: getEnv('PI_TESTNET_PROTOTYPE_API_KEY'),
    mode: getEnv('PI_TESTNET_PROTOTYPE_RELAY_MODE', 'mock'),
    network: getEnv('PI_TESTNET_PROTOTYPE_NETWORK', DEFAULT_NETWORK),
    contractAddress: getEnv('PI_TESTNET_PROTOTYPE_CONTRACT_ADDRESS', DEFAULT_CONTRACT),
    rpcUrl: getEnv('PI_TESTNET_RPC_URL', DEFAULT_RPC_URL),
    checkRpc: getBooleanEnv('PI_TESTNET_PROTOTYPE_RELAY_CHECK_RPC', true),
    realSubmitMethod: getEnv('PI_TESTNET_PROTOTYPE_REAL_SUBMIT_METHOD', 'sendTransaction'),
    realSubmitParamsJson: getEnv('PI_TESTNET_PROTOTYPE_REAL_SUBMIT_PARAMS_JSON', '{"transaction":"{{SIGNED_TRANSACTION}}"}'),
    realSignedTx: getEnv('PI_TESTNET_PROTOTYPE_REAL_SIGNED_TX'),
    realStatusMethod: getEnv('PI_TESTNET_PROTOTYPE_REAL_STATUS_METHOD', 'getTransaction'),
    realStatusParamsJson: getEnv('PI_TESTNET_PROTOTYPE_REAL_STATUS_PARAMS_JSON', '{"hash":"{{TX_HASH}}"}'),
    realConfirmAttempts: Number(getEnv('PI_TESTNET_PROTOTYPE_REAL_CONFIRM_ATTEMPTS', '8') || 8),
    realConfirmDelayMs: Number(getEnv('PI_TESTNET_PROTOTYPE_REAL_CONFIRM_DELAY_MS', '2500') || 2500),
    realTokenId: getEnv('PI_TESTNET_PROTOTYPE_REAL_TOKEN_ID'),
    realTxMode: getEnv('PI_TESTNET_PROTOTYPE_REAL_TX_MODE', 'signed_xdr'),
    realNetworkPassphrase: getEnv('PI_TESTNET_PROTOTYPE_REAL_NETWORK_PASSPHRASE'),
    realSourceSecret: getEnv('PI_TESTNET_PROTOTYPE_REAL_SOURCE_SECRET'),
    realDestination: getEnv('PI_TESTNET_PROTOTYPE_REAL_DESTINATION'),
    realAmount: getEnv('PI_TESTNET_PROTOTYPE_REAL_AMOUNT', '0.0000001'),
    realMemoPrefix: getEnv('PI_TESTNET_PROTOTYPE_REAL_MEMO_PREFIX', 'PiNFT'),
    realTimeoutSeconds: Number(getEnv('PI_TESTNET_PROTOTYPE_REAL_TIMEOUT_SECONDS', '180') || 180),
    realBaseFee: getEnv('PI_TESTNET_PROTOTYPE_REAL_BASE_FEE', '100'),
  };
}

function parseJsonTemplate(value: string, fallback: JsonValue): JsonValue {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return fallback;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readMaybeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getByPath(input: unknown, path: string): unknown {
  const segments = path.split('.').filter(Boolean);
  let current: unknown = input;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function extractFirstString(input: unknown, candidatePaths: string[]): string {
  for (const path of candidatePaths) {
    const value = getByPath(input, path);
    const parsed = readString(value);
    if (parsed) return parsed;
  }
  return '';
}

function extractTxHash(input: unknown): string {
  return (
    extractFirstString(input, [
      'result.hash',
      'result.txHash',
      'result.transactionHash',
      'result.id',
      'txHash',
      'transactionHash',
      'hash',
      'id',
    ]) || ''
  );
}

function extractTokenId(input: unknown): string {
  const direct = extractFirstString(input, [
    'result.tokenId',
    'result.token_id',
    'tokenId',
    'token_id',
    'result.id',
    'id',
  ]);
  if (direct) return direct;

  const events = readMaybeArray(getByPath(input, 'result.events')).concat(readMaybeArray(getByPath(input, 'events')));
  for (const event of events) {
    const found = extractFirstString(event, ['tokenId', 'token_id', 'id', 'data.tokenId', 'data.id']);
    if (found) return found;
  }

  return '';
}

function extractStatus(input: unknown): string {
  return extractFirstString(input, [
    'result.status',
    'result.state',
    'status',
    'state',
    'result.txStatus',
    'txStatus',
  ]).toUpperCase();
}

function isConfirmedStatus(input: unknown): boolean {
  return ['SUCCESS', 'SUCCEEDED', 'CONFIRMED', 'ACCEPTED', 'APPLIED'].includes(extractStatus(input));
}

function buildTemplateContext(body: RelayBody, config: RelayConfig, txHash?: string) {
  return {
    SIGNED_TRANSACTION: readString(body.signedTransaction) || config.realSignedTx,
    PAYMENT_IDENTIFIER: readString(body.paymentIdentifier),
    PAYMENT_TXID: readString(body.paymentTxid),
    ARTWORK_ID: String(Number(body.artworkId || 0) || ''),
    OWNER_USER_ID: String(Number(body.ownerUserId || 0) || ''),
    OWNER_NAME: readString(body.ownerName),
    CONTRACT_ADDRESS: config.contractAddress,
    NETWORK: config.network,
    RPC_URL: config.rpcUrl,
    TX_HASH: txHash || '',
    METADATA_JSON: JSON.stringify(body.metadataSnapshot || {}),
  } as const;
}

function substituteTemplate(input: JsonValue, context: ReturnType<typeof buildTemplateContext>): JsonValue {
  if (typeof input === 'string') {
    return input.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: keyof typeof context) => context[key] ?? '');
  }
  if (Array.isArray(input)) {
    return input.map((item) => substituteTemplate(item, context));
  }
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, substituteTemplate(value as JsonValue, context)])
    ) as JsonValue;
  }
  return input;
}

async function callRpc(rpcUrl: string, method: string, params: JsonValue) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Pi RPC HTTP ${response.status}`);
  }
  if (data && typeof data === 'object' && 'error' in data && (data as Record<string, unknown>).error) {
    throw new Error(JSON.stringify((data as Record<string, unknown>).error));
  }
  return data;
}

async function getNetworkPassphrase(rpcUrl: string, fallback: string) {
  try {
    const network = await callRpc(rpcUrl, 'getNetwork', {});
    return (
      extractFirstString(network, ['result.passphrase', 'result.networkPassphrase', 'passphrase', 'networkPassphrase']) ||
      fallback
    );
  } catch {
    return fallback;
  }
}

async function runSignedXdrMint(body: RelayBody, config: RelayConfig) {
  const artworkId = Number(body.artworkId || 0);
  const submittedAt = new Date();
  const template = parseJsonTemplate(config.realSubmitParamsJson, { transaction: '{{SIGNED_TRANSACTION}}' });
  const context = buildTemplateContext(body, config);
  const submitParams = substituteTemplate(template, context);
  const submitResult = await callRpc(config.rpcUrl, config.realSubmitMethod, submitParams);
  const txHash = extractTxHash(submitResult);

  let finalResult: unknown = submitResult;
  let confirmedAt = submittedAt;

  if (config.realStatusMethod && txHash) {
    const attempts = Math.max(1, config.realConfirmAttempts);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) await sleep(Math.max(0, config.realConfirmDelayMs));
      const statusTemplate = parseJsonTemplate(config.realStatusParamsJson, { hash: '{{TX_HASH}}' });
      const statusParams = substituteTemplate(statusTemplate, buildTemplateContext(body, config, txHash));
      const statusResult = await callRpc(config.rpcUrl, config.realStatusMethod, statusParams);
      finalResult = statusResult;
      if (isConfirmedStatus(statusResult)) {
        confirmedAt = new Date();
        break;
      }
    }
  }

  const tokenId =
    readString(body.tokenId) ||
    config.realTokenId ||
    extractTokenId(finalResult) ||
    extractTokenId(submitResult) ||
    buildTokenId(artworkId);

  return {
    network: config.network,
    contractAddress: config.contractAddress,
    tokenId,
    txHash: txHash || buildTxHash(`${artworkId}:${submittedAt.toISOString()}`),
    mintReference: readString(body.paymentIdentifier) || `relay-real-${artworkId}-${Date.now()}`,
    submittedAt: submittedAt.toISOString(),
    confirmedAt: confirmedAt.toISOString(),
    provider: 'vercel-relay-rpc',
    rpc: {
      realTxMode: config.realTxMode,
      submitMethod: config.realSubmitMethod,
      statusMethod: config.realStatusMethod || null,
      submitResult,
      finalResult,
    },
  };
}

async function runPaymentProbe(body: RelayBody, config: RelayConfig) {
  const sdk = await import('@stellar/stellar-sdk');
  const sourceSecret = config.realSourceSecret;
  if (!sourceSecret) {
    throw new Error('Payment probe mode requires PI_TESTNET_PROTOTYPE_REAL_SOURCE_SECRET.');
  }

  const Keypair = sdk.Keypair;
  const TransactionBuilder = sdk.TransactionBuilder;
  const Operation = sdk.Operation;
  const Asset = sdk.Asset;
  const Memo = sdk.Memo;
  const Networks = sdk.Networks;
  const BASE_FEE = sdk.BASE_FEE;

  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  const sourcePublicKey = sourceKeypair.publicKey();
  const destination = config.realDestination || sourcePublicKey;
  const networkPassphrase = await getNetworkPassphrase(config.rpcUrl, config.realNetworkPassphrase || Networks.TESTNET);

  const rpcServer = new sdk.rpc.Server(config.rpcUrl);
  const sourceAccount = await rpcServer.getAccount(sourcePublicKey);
  const memoText = `${config.realMemoPrefix}:${Number(body.artworkId || 0)}`.slice(0, 28);

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: String(config.realBaseFee || BASE_FEE),
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: config.realAmount,
      })
    )
    .addMemo(Memo.text(memoText))
    .setTimeout(Math.max(30, config.realTimeoutSeconds))
    .build();

  transaction.sign(sourceKeypair);
  const transactionXdr = transaction.toXDR();
  const simulated = await callRpc(config.rpcUrl, 'simulateTransaction', { transaction: transactionXdr }).catch((error) => ({ error: error instanceof Error ? error.message : 'simulate_failed' }));
  const submitResult = await callRpc(config.rpcUrl, 'sendTransaction', { transaction: transactionXdr });
  const txHash = extractTxHash(submitResult);
  if (!txHash) {
    throw new Error('Pi RPC did not return a transaction hash for the payment probe.');
  }

  let finalResult: unknown = submitResult;
  let confirmedAt = new Date();
  const attempts = Math.max(1, config.realConfirmAttempts);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(Math.max(0, config.realConfirmDelayMs));
    const statusResult = await callRpc(config.rpcUrl, 'getTransaction', { hash: txHash });
    finalResult = statusResult;
    const status = extractStatus(statusResult);
    if (status === 'FAILED') {
      throw new Error(`Payment probe transaction failed: ${JSON.stringify(statusResult)}`);
    }
    if (isConfirmedStatus(statusResult)) {
      confirmedAt = new Date();
      break;
    }
  }

  const artworkId = Number(body.artworkId || 0);
  return {
    network: config.network,
    contractAddress: 'stellar-native-payment-probe',
    tokenId: `payment-probe-${artworkId}-${txHash.slice(0, 12)}`,
    txHash,
    mintReference: readString(body.paymentIdentifier) || `payment-probe-${artworkId}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    confirmedAt: confirmedAt.toISOString(),
    provider: 'vercel-relay-payment-probe',
    rpc: {
      realTxMode: config.realTxMode,
      sourcePublicKey,
      destination,
      networkPassphrase,
      transactionXdr,
      simulated,
      submitResult,
      finalResult,
    },
  };
}

export async function GET() {
  const config = getRelayConfig();
  let rpc: Record<string, unknown> | null = null;

  if (config.checkRpc) {
    try {
      rpc = await rpcHealth(config.rpcUrl);
    } catch (error) {
      rpc = { ok: false, error: error instanceof Error ? error.message : 'RPC health check failed.' };
    }
  }

  return NextResponse.json({
    ok: true,
    relayMode: config.mode,
    relayNetwork: config.network,
    relayContractAddress: config.contractAddress,
    relayRpcUrl: config.rpcUrl,
    appRelayUrl: `${getAppBaseUrl()}/api/pi/testnet-relay`,
    realTxMode: config.realTxMode,
    realSubmitMethod: config.realSubmitMethod,
    realStatusMethod: config.realStatusMethod || null,
    hasRealSignedTransaction: Boolean(config.realSignedTx),
    hasRealSourceSecret: Boolean(config.realSourceSecret),
    realDestination: config.realDestination || null,
    rpc,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const config = getRelayConfig();

  if (config.apiKey && getBearerToken(request) !== config.apiKey) {
    return unauthorized();
  }

  try {
    const body = (await request.json().catch(() => ({}))) as RelayBody;
    const artworkId = Number(body.artworkId || 0);
    if (!artworkId) {
      return NextResponse.json({ error: 'artworkId is required.' }, { status: 400 });
    }

    let rpc: Record<string, unknown> | null = null;
    if (config.checkRpc) {
      try {
        rpc = await rpcHealth(config.rpcUrl);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'RPC health check failed.' },
          { status: 502 }
        );
      }
    }

    if (config.mode === 'real') {
      if (config.realTxMode === 'payment_probe') {
        const result = await runPaymentProbe(body, config);
        return NextResponse.json({ ...result, rpcHealth: rpc });
      }

      const signedTransaction = readString(body.signedTransaction) || config.realSignedTx;
      if (!signedTransaction) {
        return NextResponse.json(
          {
            error:
              'Relay real mode requires a signed transaction. Set PI_TESTNET_PROTOTYPE_REAL_SIGNED_TX or send signedTransaction in the request body. Alternatively, set PI_TESTNET_PROTOTYPE_REAL_TX_MODE=payment_probe and configure a testnet secret key to send a real payment probe.',
            rpc,
          },
          { status: 400 }
        );
      }

      const result = await runSignedXdrMint(body, config);
      return NextResponse.json({ ...result, rpcHealth: rpc });
    }

    if (config.mode === 'manual') {
      return NextResponse.json(
        {
          error:
            'Relay is in manual mode. Switch PI_TESTNET_PROTOTYPE_RELAY_MODE=mock to test the app flow, or set PI_TESTNET_PROTOTYPE_RELAY_MODE=real with PI_TESTNET_PROTOTYPE_REAL_TX_MODE=signed_xdr or payment_probe to attempt a real RPC call.',
          rpc,
        },
        { status: 501 }
      );
    }

    const submittedAt = new Date();
    const paymentIdentifier = typeof body.paymentIdentifier === 'string' ? body.paymentIdentifier.trim() : '';

    return NextResponse.json({
      network: config.network,
      contractAddress: config.contractAddress,
      tokenId: buildTokenId(artworkId),
      txHash: buildTxHash(`${artworkId}:${submittedAt.toISOString()}:${Math.random()}`),
      mintReference: paymentIdentifier || `relay-${artworkId}-${Date.now()}`,
      submittedAt: submittedAt.toISOString(),
      confirmedAt: submittedAt.toISOString(),
      provider: 'vercel-relay-mock',
      rpc,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected relay error.' },
      { status: 500 }
    );
  }
}
