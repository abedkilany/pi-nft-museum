import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';
import { assertSameOrigin } from '@/lib/services/request';
import { getAuctionSettings, AUCTION_STATUS } from '@/lib/auctions';

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const artworkId = Number(body?.artworkId);
    const basePrice = Number(body?.basePrice);
    const discountPercent = Number(body?.discountPercent);
    const listingType = String(body?.listingType || ArtworkListingType.NOT_FOR_SALE);
    const visibility = String(body?.visibility || ArtworkVisibility.PUBLIC);
    const auctionDurationHours = Number(body?.auctionDurationHours);
    const auctionMinIncrement = Number(body?.auctionMinIncrement);
    const auctionStartMode = String(body?.auctionStartMode || 'NOW');
    const auctionStartsAtRaw = typeof body?.auctionStartsAt === 'string' ? body.auctionStartsAt : null;

    if (!Number.isInteger(artworkId) || artworkId <= 0) {
      return NextResponse.json({ error: 'Valid artworkId is required.' }, { status: 400 });
    }

    if (!Object.values(ArtworkListingType).includes(listingType as ArtworkListingType)) {
      return NextResponse.json({ error: 'Invalid listing type.' }, { status: 400 });
    }

    if (!Object.values(ArtworkVisibility).includes(visibility as ArtworkVisibility)) {
      return NextResponse.json({ error: 'Invalid visibility.' }, { status: 400 });
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return NextResponse.json({ error: 'Base price must be 0 or higher.' }, { status: 400 });
    }

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json({ error: 'Discount must be between 0 and 100.' }, { status: 400 });
    }

    let scheduledStartsAt: Date | null = null;
    if (listingType === ArtworkListingType.AUCTION) {
      if (!Number.isFinite(auctionDurationHours) || auctionDurationHours < 1) {
        return NextResponse.json({ error: 'Auction duration must be at least 1 hour.' }, { status: 400 });
      }
      if (!Number.isFinite(auctionMinIncrement) || auctionMinIncrement < 0.01) {
        return NextResponse.json({ error: 'Auction minimum increment must be at least 0.01.' }, { status: 400 });
      }
      if (auctionStartMode !== 'NOW' && auctionStartMode !== 'SCHEDULED') {
        return NextResponse.json({ error: 'Invalid auction start mode.' }, { status: 400 });
      }
      if (auctionStartMode === 'SCHEDULED') {
        if (!auctionStartsAtRaw) {
          return NextResponse.json({ error: 'Scheduled auctions require a start time.' }, { status: 400 });
        }
        scheduledStartsAt = new Date(auctionStartsAtRaw);
        if (Number.isNaN(scheduledStartsAt.getTime())) {
          return NextResponse.json({ error: 'Invalid scheduled start time.' }, { status: 400 });
        }
        if (scheduledStartsAt.getTime() <= Date.now() + 5 * 60 * 1000) {
          return NextResponse.json({ error: 'Scheduled auctions must start at least 5 minutes in the future.' }, { status: 400 });
        }
      }
    }

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        artistUserId: true,
        currentOwnerUserId: true,
        status: true,
        mintStatus: true,
        listingType: true,
        visibility: true,
        basePrice: true,
        discountPercent: true,
        currency: true,
      },
    });

    if (!artwork) {
      return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    }

    const ownerUserId = artwork.currentOwnerUserId ?? artwork.artistUserId;
    if (ownerUserId !== currentUser.userId) {
      return NextResponse.json({ error: 'Only the current artwork owner can manage these settings.' }, { status: 403 });
    }

    if (![ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(artwork.status as ArtworkStatus)) {
      return NextResponse.json({ error: 'Display settings can be edited only after Lazy Mint or Mint publishes the artwork.' }, { status: 400 });
    }

    const mintStatus = artwork.mintStatus as ArtworkMintStatus;
    const canSell = [ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes(mintStatus);

    if (!canSell && listingType !== ArtworkListingType.NOT_FOR_SALE) {
      return NextResponse.json({ error: 'This artwork must be lazy minted or minted before it can be listed for sale.' }, { status: 400 });
    }

    const safeBasePrice = roundCurrency(basePrice);
    const safeDiscount = roundCurrency(discountPercent);
    const computedPrice = roundCurrency(Math.max(0, safeBasePrice - (safeBasePrice * safeDiscount / 100)));
    const effectiveVisibility = listingType === ArtworkListingType.AUCTION ? ArtworkVisibility.PUBLIC : (visibility as ArtworkVisibility);

    if (listingType !== ArtworkListingType.NOT_FOR_SALE && computedPrice <= 0) {
      return NextResponse.json({ error: 'Final price must stay above 0 when the artwork is listed for sale.' }, { status: 400 });
    }

    const auctionSettings = await getAuctionSettings();
    const now = new Date();
    const effectiveStartsAt = listingType === ArtworkListingType.AUCTION ? (scheduledStartsAt ?? now) : now;
    const effectiveAuctionStatus = listingType === ArtworkListingType.AUCTION && scheduledStartsAt && scheduledStartsAt > now ? AUCTION_STATUS.SCHEDULED : AUCTION_STATUS.LIVE;
    const resolvedAuctionDurationHours = listingType === ArtworkListingType.AUCTION
      ? Math.max(1, Math.floor(auctionDurationHours))
      : auctionSettings.defaultDurationHours;
    const resolvedAuctionMinIncrement = listingType === ArtworkListingType.AUCTION
      ? Math.max(auctionSettings.minIncrement, roundCurrency(auctionMinIncrement))
      : auctionSettings.minIncrement;
    const latestAuction = await prisma.auction.findFirst({
      where: { artworkId },
      orderBy: [{ createdAt: 'desc' }],
      include: { bids: true },
    });

    if (listingType === ArtworkListingType.AUCTION && latestAuction && (latestAuction.status === AUCTION_STATUS.LIVE || latestAuction.status === AUCTION_STATUS.PAYMENT_PENDING)) {
      return NextResponse.json({ error: 'Live auctions and auctions waiting for payment cannot be edited from Manage artwork.' }, { status: 400 });
    }

    if (listingType !== ArtworkListingType.AUCTION && latestAuction && (latestAuction.status === AUCTION_STATUS.LIVE || latestAuction.status === AUCTION_STATUS.SCHEDULED || latestAuction.status === AUCTION_STATUS.PAYMENT_PENDING)) {
      if (latestAuction.bids.length > 0 || latestAuction.status === AUCTION_STATUS.PAYMENT_PENDING) {
        return NextResponse.json({ error: 'This artwork already has an auction with bids or a payment in progress. Finish that auction before changing the listing type.' }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const artworkUpdate = await tx.artwork.update({
        where: { id: artworkId },
        data: {
          basePrice: safeBasePrice,
          discountPercent: safeDiscount,
          price: computedPrice,
          listingType: canSell ? (listingType as ArtworkListingType) : ArtworkListingType.NOT_FOR_SALE,
          visibility: effectiveVisibility,
        },
        select: {
          id: true,
          basePrice: true,
          discountPercent: true,
          price: true,
          listingType: true,
          visibility: true,
        },
      });

      if (listingType === ArtworkListingType.AUCTION && canSell) {
        if (!latestAuction || (latestAuction.status !== AUCTION_STATUS.LIVE && latestAuction.status !== AUCTION_STATUS.SCHEDULED && latestAuction.status !== AUCTION_STATUS.PAYMENT_PENDING)) {
          await tx.auction.create({
            data: {
              artworkId,
              sellerUserId: ownerUserId,
              startingPrice: computedPrice,
              minIncrement: resolvedAuctionMinIncrement,
              status: effectiveAuctionStatus,
              startsAt: effectiveStartsAt,
              endsAt: new Date(effectiveStartsAt.getTime() + resolvedAuctionDurationHours * 60 * 60 * 1000),
              commissionPercent: auctionSettings.commissionPercent,
            },
          });
        } else if (latestAuction.bids.length === 0 && latestAuction.status !== AUCTION_STATUS.PAYMENT_PENDING) {
          await tx.auction.update({
            where: { id: latestAuction.id },
            data: {
              startingPrice: computedPrice,
              minIncrement: resolvedAuctionMinIncrement,
              commissionPercent: auctionSettings.commissionPercent,
              status: effectiveAuctionStatus,
              startsAt: effectiveStartsAt,
              endsAt: new Date(effectiveStartsAt.getTime() + resolvedAuctionDurationHours * 60 * 60 * 1000),
            },
          });
        }
      }

      if (listingType !== ArtworkListingType.AUCTION && latestAuction && (latestAuction.status === AUCTION_STATUS.LIVE || latestAuction.status === AUCTION_STATUS.SCHEDULED) && latestAuction.bids.length === 0) {
        await tx.auction.update({ where: { id: latestAuction.id }, data: { status: AUCTION_STATUS.CANCELLED, cancelledAt: now } });
      }

      return artworkUpdate;
    });

    return NextResponse.json({ ok: true, artwork: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
