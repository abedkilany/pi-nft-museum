import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';
import { assertSameOrigin } from '@/lib/services/request';

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

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        artistUserId: true,
        currentOwnerUserId: true,
        status: true,
        mintStatus: true,
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

    if (listingType !== ArtworkListingType.NOT_FOR_SALE && computedPrice <= 0) {
      return NextResponse.json({ error: 'Final price must stay above 0 when the artwork is listed for sale.' }, { status: 400 });
    }

    const updated = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        basePrice: safeBasePrice,
        discountPercent: safeDiscount,
        price: computedPrice,
        listingType: canSell ? (listingType as ArtworkListingType) : ArtworkListingType.NOT_FOR_SALE,
        visibility: visibility as ArtworkVisibility,
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

    return NextResponse.json({ ok: true, artwork: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
