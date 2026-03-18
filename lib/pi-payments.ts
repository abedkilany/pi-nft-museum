import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const PI_API_BASE = 'https://api.minepi.com/v2';

function getServerApiKey() {
  return process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY || '';
}

function getAuthHeaders() {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    throw new Error('PI_SERVER_API_KEY is not configured on the server.');
  }

  return {
    Authorization: `Key ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

export async function callPiPaymentApi(path: string, init?: RequestInit) {
  const response = await fetch(`${PI_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Pi payment API failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function ensurePaymentRecord(paymentIdentifier: string, artworkId: number, buyerUserId: number) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, artistUserId: true, title: true, price: true, currency: true, status: true }
  });

  if (!artwork) throw new Error('Artwork not found.');
  if (artwork.artistUserId === buyerUserId) throw new Error('You cannot buy your own artwork.');
  if (!['PUBLISHED', 'PREMIUM'].includes(artwork.status)) throw new Error('This artwork is not available for payment right now.');

  return { artwork };
}

export function assertTestnetNetwork(network: string | undefined | null) {
  const testnetOnly = String(process.env.PI_PAYMENT_TESTNET_ONLY || 'true') !== 'false';
  if (testnetOnly && network && network !== 'Pi Testnet') {
    throw new Error(`Payment network must be Pi Testnet during testing. Received: ${network}`);
  }
}

export async function logPaymentEvent(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta || {});
}
