import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';

export function resolveArtworkOwnerUserId(artwork: { currentOwnerUserId?: number | null; artistUserId: number }) {
  return artwork.currentOwnerUserId ?? artwork.artistUserId;
}

export function isArtworkPubliclyVisible(artwork: { visibility?: string | null }) {
  return (artwork.visibility || ArtworkVisibility.PRIVATE) === ArtworkVisibility.PUBLIC;
}

export function isArtworkPurchasable(artwork: { status: string; mintStatus?: string | null; listingType?: string | null; visibility?: string | null }) {
  return [ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(artwork.status as ArtworkStatus)
    && [ArtworkMintStatus.LAZY_MINTED, ArtworkMintStatus.MINTED].includes((artwork.mintStatus || ArtworkMintStatus.UNMINTED) as ArtworkMintStatus)
    && (artwork.listingType || ArtworkListingType.NOT_FOR_SALE) === ArtworkListingType.FIXED_PRICE
    && isArtworkPubliclyVisible(artwork);
}

export function isArtworkAuction(artwork: { listingType?: string | null; visibility?: string | null }) {
  return (artwork.listingType || ArtworkListingType.NOT_FOR_SALE) === ArtworkListingType.AUCTION
    && isArtworkPubliclyVisible(artwork);
}

export function getDefaultArtworkState() {
  return {
    status: ArtworkStatus.DRAFT,
    mintStatus: ArtworkMintStatus.UNMINTED,
    listingType: ArtworkListingType.NOT_FOR_SALE,
    visibility: ArtworkVisibility.PRIVATE,
  };
}
