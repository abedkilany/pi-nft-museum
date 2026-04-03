import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { getCurrentArtworkAuction, serializeAuction, getAuctionPenaltyState } from '@/lib/auctions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const artworkId = Number(url.searchParams.get('artworkId') || '0');
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return NextResponse.json({ ok: false, error: 'Valid artworkId is required.' }, { status: 400 });
    }

    const auction = await getCurrentArtworkAuction(artworkId);
    if (!auction) {
      return NextResponse.json({ ok: false, error: 'Auction not found.' }, { status: 404 });
    }

    const currentUser = await getCurrentUserFromHeaders(request.headers);
    let myHighestBid: number | null = null;
    let penalty = null;
    if (currentUser) {
      const user = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { auctionBanPermanent: true, auctionSuspendedUntil: true, auctionFailedPaymentCount: true } });
      penalty = user ? getAuctionPenaltyState(user) : null;
      const bid = auction.bids.find((item) => item.bidderUserId === currentUser.userId);
      myHighestBid = bid ? Number(bid.amount) : null;
    }

    return NextResponse.json({ ok: true, auction: serializeAuction(auction), myHighestBid, penalty });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
