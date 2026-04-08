import { NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { buildAuctionViewerState, getAuctionPenaltyState, getCurrentArtworkAuction, getUserHighestBidAmount, reconcileAuctionState, serializeAuction } from '@/lib/auctions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const artworkId = Number(url.searchParams.get('artworkId') || '0');
    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return NextResponse.json({ ok: false, error: 'Valid artworkId is required.' }, { status: 400 });
    }

    const currentAuction = await getCurrentArtworkAuction(artworkId);
    if (!currentAuction) {
      return NextResponse.json({ ok: false, error: 'Auction not found.' }, { status: 404 });
    }

    const auction = await reconcileAuctionState(currentAuction.id);
    if (!auction) {
      return NextResponse.json({ ok: false, error: 'Auction not found.' }, { status: 404 });
    }

    const serializedAuction = serializeAuction(auction);
    const currentUser = await getCurrentUserFromHeaders(request.headers);
    let penalty = null;
    if (currentUser) {
      const user = await prisma.user.findUnique({ where: { id: currentUser.userId }, select: { auctionBanPermanent: true, auctionSuspendedUntil: true, auctionFailedPaymentCount: true } });
      penalty = user ? getAuctionPenaltyState(user) : null;
    }

    const myHighestBid = currentUser && serializedAuction ? await getUserHighestBidAmount(serializedAuction.id, currentUser.userId) : null;
    const viewerState = buildAuctionViewerState(serializedAuction, currentUser, penalty, { myHighestBid });

    return NextResponse.json({ ok: true, auction: serializedAuction, penalty, viewerState, myHighestBid: viewerState.myHighestBid, serverTime: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
