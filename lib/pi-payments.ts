import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/env';
import { ArtworkMintStatus } from '@/types/enums';

const PI_API_BASE = 'https://api.minepi.com/v2';

function getServerApiKey() {
  return getEnv('PI_SERVER_API_KEY') || getEnv('PI_API_KEY');
}

function getAuthHeaders() {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    throw new Error('PI_SERVER_API_KEY is not configured in .env');
  }

  return {
    Authorization: `Key ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function callPiPaymentApi(path: string, init?: RequestInit) {
  const response = await fetch(`${PI_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Pi payment API failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function ensurePaymentRecord(paymentIdentifier: string, artworkId: number, buyerUserId: number, purpose: 'ARTWORK_PURCHASE' | 'LAZY_MINT_FEE' | 'AUCTION_WIN' = 'ARTWORK_PURCHASE', auctionId?: number) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, artistUserId: true, currentOwnerUserId: true, title: true, price: true, currency: true, status: true, mintStatus: true, listingType: true, visibility: true },
  });

  if (!artwork) throw new Error('Artwork not found.');

  if (purpose === 'LAZY_MINT_FEE') {
    if ((artwork.currentOwnerUserId ?? artwork.artistUserId) !== buyerUserId) throw new Error('Only the artwork owner can pay the lazy mint fee.');
    if (artwork.status !== 'PUBLIC_REVIEW') {
      throw new Error('This artwork is not available for lazy mint payment right now.');
    }
    return { artwork };
  }

  if (purpose === 'AUCTION_WIN') {
    const auction = await prisma.auction.findFirst({
      where: {
        ...(auctionId ? { id: auctionId } : {}),
        artworkId,
        winnerUserId: buyerUserId,
        status: 'PAYMENT_PENDING',
      },
      select: { id: true, winningAmount: true, paymentDueAt: true, sellerUserId: true },
    });
    if (!auction) {
      throw new Error('No payable auction win was found for this artwork.');
    }
    if (auction.paymentDueAt && auction.paymentDueAt <= new Date()) {
      throw new Error('The payment window for this auction has already expired.');
    }
    return { artwork, auction };
  }


  if ((artwork.currentOwnerUserId ?? artwork.artistUserId) === buyerUserId) throw new Error('You cannot buy your own artwork.');
  if (!['PUBLISHED', 'PREMIUM'].includes(artwork.status) || ![ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes(artwork.mintStatus as ArtworkMintStatus) || artwork.listingType !== 'FIXED_PRICE' || artwork.visibility !== 'PUBLIC') {
    throw new Error('This artwork is not available for payment right now.');
  }

  return { artwork };
}

export function assertTestnetNetwork(network: string | undefined | null) {
  const testnetOnly = String(getEnv('PI_PAYMENT_TESTNET_ONLY', 'true')) !== 'false';
  if (testnetOnly && network && network !== 'Pi Testnet') {
    throw new Error(`Payment network must be Pi Testnet during testing. Received: ${network}`);
  }
}

export async function logPaymentEvent(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta || {});
}
