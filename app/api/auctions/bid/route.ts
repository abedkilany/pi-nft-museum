import { NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/api-guards';
import { assertSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { AUCTION_BID_STATUS, AUCTION_STATUS, getAuctionEligibilityReason, getAuctionPenaltyState, getAuctionSettings, getCurrentArtworkAuction, reconcileAuctionState, serializeAuction } from '@/lib/auctions';
import { checkMultiRateLimit, createRateLimitResponse, getRequestIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  try {
    const auth = await requireAuthenticatedRequest(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const artworkId = Number(body?.artworkId || 0);
    const amount = Number(body?.amount || 0);
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return NextResponse.json({ ok: false, error: 'Valid artworkId is required.' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'A valid bid amount is required.' }, { status: 400 });
    }

    const rateLimitResult = checkMultiRateLimit({
      keyParts: ['auction-bid', auth.user.userId, getRequestIp(request), artworkId],
      strategies: [
        { limit: 5, windowMs: 10_000, scope: 'burst' },
        { limit: 25, windowMs: 60_000, scope: 'minute' },
      ],
    });
    if (!rateLimitResult.ok) {
      return createRateLimitResponse('Too many bids submitted too quickly. Please wait a moment and try again.', rateLimitResult.resetAt);
    }

    const [settings, user] = await Promise.all([
      getAuctionSettings(),
      prisma.user.findUnique({ where: { id: auth.user.userId }, select: { id: true, username: true, auctionBanPermanent: true, auctionSuspendedUntil: true, auctionFailedPaymentCount: true } }),
    ]);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
    }

    const penalty = getAuctionPenaltyState(user);
    if (penalty.permanentlyBanned) {
      return NextResponse.json({ ok: false, error: 'Your account is permanently blocked from auctions.' }, { status: 403 });
    }
    if (penalty.temporarilySuspended) {
      return NextResponse.json({ ok: false, error: `Auction access is suspended until ${penalty.suspendedUntil?.toLocaleString()}.` }, { status: 403 });
    }

    const currentAuction = await getCurrentArtworkAuction(artworkId);
    if (!currentAuction) {
      return NextResponse.json({ ok: false, error: 'No active auction found for this artwork.' }, { status: 404 });
    }

    const lockedAuction = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Auction" WHERE id = ${currentAuction.id} FOR UPDATE`;
      const auction = await tx.auction.findUnique({
        where: { id: currentAuction.id },
        include: {
          artwork: { select: { id: true, title: true, imageUrl: true, slug: true, currency: true, status: true, mintStatus: true, visibility: true, listingType: true } },
          winner: { select: { id: true, username: true } },
          bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }], include: { bidder: { select: { id: true, username: true } } } },
        },
      });
      if (!auction) throw new Error('Auction not found.');

      if (auction.status === AUCTION_STATUS.SCHEDULED && auction.startsAt <= new Date()) {
        await tx.auction.update({ where: { id: auction.id }, data: { status: AUCTION_STATUS.LIVE } });
        auction.status = AUCTION_STATUS.LIVE;
      }
      if (auction.status !== AUCTION_STATUS.LIVE) {
        throw new Error('This auction is not currently accepting bids.');
      }

      const reason = getAuctionEligibilityReason(auction.artwork);
      if (reason) throw new Error(reason);
      if (auction.sellerUserId === auth.user.userId) {
        throw new Error('You cannot bid on your own artwork.');
      }
      if (auction.endsAt <= new Date()) {
        throw new Error('This auction has already ended. Refresh the page to see the final state.');
      }

      const currentHighest = auction.bids.length > 0 ? Number(auction.bids[0].amount) : null;
      const minimum = currentHighest == null ? Number(auction.startingPrice) : Number(auction.bids[0].amount) + Number(auction.minIncrement);
      if (amount < minimum) {
        throw new Error(`Bid must be at least ${minimum.toFixed(2)} ${auction.artwork.currency}.`);
      }

      await tx.auctionBid.updateMany({
        where: { auctionId: auction.id, bidderUserId: auth.user.userId, status: { in: [AUCTION_BID_STATUS.ACTIVE, AUCTION_BID_STATUS.OUTBID] } },
        data: { status: AUCTION_BID_STATUS.OUTBID },
      });
      await tx.auctionBid.updateMany({
        where: { auctionId: auction.id, status: AUCTION_BID_STATUS.ACTIVE },
        data: { status: AUCTION_BID_STATUS.OUTBID },
      });
      await tx.auctionBid.create({ data: { auctionId: auction.id, bidderUserId: auth.user.userId, amount, status: AUCTION_BID_STATUS.ACTIVE } });

      const msRemaining = auction.endsAt.getTime() - Date.now();
      if (
        settings.antiSnipeWindowMinutes > 0 &&
        settings.antiSnipeExtendMinutes > 0 &&
        msRemaining <= settings.antiSnipeWindowMinutes * 60 * 1000 &&
        auction.extendedCount < settings.antiSnipeMaxExtensions
      ) {
        await tx.auction.update({
          where: { id: auction.id },
          data: {
            endsAt: new Date(auction.endsAt.getTime() + settings.antiSnipeExtendMinutes * 60 * 1000),
            extendedCount: { increment: 1 },
          },
        });
      }

      return auction.id;
    });

    const updatedAuction = await reconcileAuctionState(lockedAuction, settings);
    return NextResponse.json({ ok: true, auction: serializeAuction(updatedAuction) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    const status = [
      'Auction not found.',
      'No active auction found for this artwork.',
    ].includes(message)
      ? 404
      : message.includes('permanently blocked') || message.includes('suspended until')
        ? 403
        : message.includes('Bid must be at least') || message.includes('not currently accepting bids') || message.includes('already ended') || message.includes('You cannot bid on your own artwork.')
          ? 400
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
