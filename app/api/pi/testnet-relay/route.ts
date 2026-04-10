import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAppBaseUrl, getBooleanEnv, getEnv } from '@/lib/env';

const DEFAULT_RPC_URL = 'https://rpc.testnet.minepi.com';
const DEFAULT_NETWORK = 'Pi Testnet';
const DEFAULT_CONTRACT = 'pi-testnet-prototype-contract';

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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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

    if (config.mode === 'manual') {
      return NextResponse.json(
        {
          error:
            'Relay is in manual mode. Switch PI_TESTNET_PROTOTYPE_RELAY_MODE=mock to test the app flow, or replace this endpoint with a real contract sender later.',
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
