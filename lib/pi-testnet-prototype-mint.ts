import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getBooleanEnv, getEnv } from '@/lib/env';

export type PrototypeMintPayload = {
  artworkId: number;
  ownerUserId: number;
  ownerName: string;
  ownerWalletAddress?: string | null;
  paymentIdentifier?: string | null;
  paymentTxid?: string | null;
  metadataSnapshot: Prisma.InputJsonObject;
};

export type PrototypeMintResult = {
  network: string;
  contractAddress: string;
  tokenId: string;
  txHash: string;
  mintReference: string;
  submittedAt: Date;
  confirmedAt: Date;
  provider: 'relay' | 'mock';
  rawResult?: unknown;
};

const DEFAULT_NETWORK = 'Pi Testnet';

function buildMintReference(artworkId: number) {
  return `pi-testnet-mint-${artworkId}-${Date.now()}`;
}

function buildTokenId(artworkId: number) {
  return `${artworkId}-${Date.now()}`;
}

function buildTxHash(artworkId: number) {
  return `0x${crypto.createHash('sha256').update(`${artworkId}:${Date.now()}:${Math.random()}`).digest('hex')}`;
}

function getPrototypeConfig() {
  return {
    relayUrl: getEnv('PI_TESTNET_PROTOTYPE_RELAY_URL'),
    contractAddress: getEnv('PI_TESTNET_PROTOTYPE_CONTRACT_ADDRESS', 'pi-testnet-prototype-contract'),
    network: getEnv('PI_TESTNET_PROTOTYPE_NETWORK', DEFAULT_NETWORK),
    allowMock: getBooleanEnv('PI_TESTNET_PROTOTYPE_ALLOW_MOCK', false),
    apiKey: getEnv('PI_TESTNET_PROTOTYPE_API_KEY'),
    rpcUrl: getEnv('PI_TESTNET_RPC_URL', 'https://rpc.testnet.minepi.com'),
  };
}

async function relayPrototypeMint(payload: PrototypeMintPayload): Promise<PrototypeMintResult | null> {
  const config = getPrototypeConfig();
  if (!config.relayUrl) return null;

  const response = await fetch(config.relayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      rpcUrl: config.rpcUrl,
      network: config.network,
      contractAddress: config.contractAddress,
      ...payload,
    }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Prototype mint relay failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  const tokenId = typeof data.tokenId === 'string' && data.tokenId.trim() ? data.tokenId.trim() : '';
  const txHash = typeof data.txHash === 'string' && data.txHash.trim() ? data.txHash.trim() : '';
  if (!tokenId || !txHash) {
    throw new Error('Prototype mint relay response is missing tokenId or txHash.');
  }

  return {
    network: typeof data.network === 'string' && data.network.trim() ? data.network.trim() : config.network,
    contractAddress: typeof data.contractAddress === 'string' && data.contractAddress.trim() ? data.contractAddress.trim() : config.contractAddress,
    tokenId,
    txHash,
    mintReference: typeof data.mintReference === 'string' && data.mintReference.trim() ? data.mintReference.trim() : buildMintReference(payload.artworkId),
    submittedAt: data.submittedAt ? new Date(String(data.submittedAt)) : new Date(),
    confirmedAt: data.confirmedAt ? new Date(String(data.confirmedAt)) : new Date(),
    provider: 'relay',
    rawResult: data,
  };
}

function mockPrototypeMint(payload: PrototypeMintPayload): PrototypeMintResult {
  const config = getPrototypeConfig();
  const submittedAt = new Date();
  return {
    network: config.network,
    contractAddress: config.contractAddress,
    tokenId: buildTokenId(payload.artworkId),
    txHash: payload.paymentTxid || buildTxHash(payload.artworkId),
    mintReference: payload.paymentIdentifier || buildMintReference(payload.artworkId),
    submittedAt,
    confirmedAt: submittedAt,
    provider: 'mock',
    rawResult: {
      warning: 'PI_TESTNET_PROTOTYPE_ALLOW_MOCK=true',
      relayUrl: config.relayUrl || null,
    },
  };
}

export async function runPiTestnetPrototypeMint(payload: PrototypeMintPayload): Promise<PrototypeMintResult> {
  const relayed = await relayPrototypeMint(payload);
  if (relayed) return relayed;

  const { allowMock } = getPrototypeConfig();
  if (!allowMock) {
    throw new Error('Pi Testnet prototype mint relay is not configured. Set PI_TESTNET_PROTOTYPE_RELAY_URL or explicitly enable PI_TESTNET_PROTOTYPE_ALLOW_MOCK=true for local testing.');
  }

  return mockPrototypeMint(payload);
}

export function getPiTestnetPrototypeContractAddress() {
  return getPrototypeConfig().contractAddress;
}

export function getPiTestnetPrototypeNetwork() {
  return getPrototypeConfig().network;
}
