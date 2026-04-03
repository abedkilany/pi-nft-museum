import { NextResponse } from 'next/server';
import { requireAuthenticatedRequest } from '@/lib/api-guards';
import { assertSameOrigin } from '@/lib/security';
import { prisma } from '@/lib/prisma';
import { getAuctionEligibilityReason, getAuctionPenaltyState, getAuctionSettings, getCurrentArtworkAuction, serializeAuction, AUCTION_STATUS } from '@/lib/auctions';

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

    const auction = await getCurrentArtworkAuction(artworkId);
    if (!auction) {
      return NextResponse.json({ ok: false, error: 'No active auction found for this artwork.' }, { status: 404 });
    }

    const reason = getAuctionEligibilityReason(auction.artwork);
    if (reason) {
      return NextResponse.json({ ok: false, error: reason }, { status: 400 });
    }
    if (auction.sellerUserId === auth.user.userId) {
      return NextResponse.json({ ok: false, error: 'You cannot bid on your own artwork.' }, { status: 400 });
    }
    if (auction.status !== AUCTION_STATUS.LIVE) {
      return NextResponse.json({ ok: false, error: 'This auction is not currently accepting bids.' }, { status: 400 });
    }

    const currentHighest = auction.bids.length > 0 ? Number(auction.bids[0].amount) : null;
    const minimum = currentHighest == null ? Number(auction.startingPrice) : Number(auction.bids[0].amount) + Number(auction.minIncrement);
    if (amount < minimum) {
      return NextResponse.json({ ok: false, error: `Bid must be at least ${minimum.toFixed(2)} ${auction.artwork.currency}.` }, { status: 400 });
    }

    const updatedAuction = await prisma.$transaction(async (tx) => {
      await tx.auctionBid.updateMany({ where: { auctionId: auction.id, bidderUserId: auth.user.userId }, data: { status: 'OUTBID' } });
      await tx.auctionBid.create({ data: { auctionId: auction.id, bidderUserId: auth.user.userId, amount } });

      const msRemaining = auction.endsAt.getTime() - Date.now();
      if (settings.antiSnipeWindowMinutes > 0 && settings.antiSnipeExtendMinutes > 0 && msRemaining <= settings.antiSnipeWindowMinutes * 60 * 1000 && auction.extendedCount < settings.antiSnipeMaxExtensions) {
        await tx.auction.update({
          where: { id: auction.id },
          data: {
            endsAt: new Date(auction.endsAt.getTime() + settings.antiSnipeExtendMinutes * 60 * 1000),
            extendedCount: { increment: 1 },
          },
        });
      }

      return tx.auction.findUnique({
        where: { id: auction.id },
        include: {
          artwork: { select: { id: true, title: true, imageUrl: true, slug: true, currency: true, status: true, mintStatus: true, visibility: true, listingType: true } },
          winner: { select: { id: true, username: true } },
          bids: { orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }], include: { bidder: { select: { id: true, username: true } } } },
        },
      });
    });

    return NextResponse.json({ ok: true, auction: serializeAuction(updatedAuction) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
