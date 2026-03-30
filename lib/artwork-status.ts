import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';

export const ARTWORK_STATUS_LABELS: Record<string, string> = {
  [ArtworkStatus.DRAFT]: 'Draft',
  [ArtworkStatus.PENDING_REVIEW]: 'Pending review',
  [ArtworkStatus.PUBLIC_REVIEW]: 'Public review',
  [ArtworkStatus.PUBLISHED]: 'Published',
  [ArtworkStatus.PREMIUM]: 'Premium',
  [ArtworkStatus.REJECTED]: 'Rejected',
  [ArtworkStatus.ARCHIVED]: 'Archived',
};

export const ARTWORK_MINT_STATUS_LABELS: Record<string, string> = {
  [ArtworkMintStatus.UNMINTED]: 'Off chain',
  [ArtworkMintStatus.MINTED]: 'On chain',
};

export const ARTWORK_LISTING_LABELS: Record<string, string> = {
  [ArtworkListingType.NOT_FOR_SALE]: 'Not for sale',
  [ArtworkListingType.FIXED_PRICE]: 'For sale',
  [ArtworkListingType.AUCTION]: 'Auction',
};

export const ARTWORK_VISIBILITY_LABELS: Record<string, string> = {
  [ArtworkVisibility.PRIVATE]: 'Private',
  [ArtworkVisibility.PUBLIC]: 'Public',
  [ArtworkVisibility.FOLLOWERS]: 'Followers',
};

export function getArtworkStatusLabel(status: string) {
  return ARTWORK_STATUS_LABELS[status] || status;
}

export function getArtworkMintStatusLabel(status: string) {
  return ARTWORK_MINT_STATUS_LABELS[status] || status;
}

export function getArtworkListingLabel(listingType: string) {
  return ARTWORK_LISTING_LABELS[listingType] || listingType;
}

export function getArtworkVisibilityLabel(visibility: string) {
  return ARTWORK_VISIBILITY_LABELS[visibility] || visibility;
}

export function canAppearInMainGallery(artwork: { status: string; visibility?: string | null }) {
  return [ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(artwork.status as ArtworkStatus)
    && (artwork.visibility || ArtworkVisibility.PRIVATE) === ArtworkVisibility.PUBLIC;
}

export function canReceiveRatings(artwork: { status: string; visibility?: string | null }) {
  return artwork.status === ArtworkStatus.PUBLIC_REVIEW
    && (artwork.visibility || ArtworkVisibility.PRIVATE) === ArtworkVisibility.PUBLIC;
}

export function canReceiveReactions(artwork: { status: string; mintStatus?: string | null; visibility?: string | null }) {
  return [ArtworkStatus.PUBLISHED, ArtworkStatus.PREMIUM].includes(artwork.status as ArtworkStatus)
    && (artwork.mintStatus || ArtworkMintStatus.UNMINTED) === ArtworkMintStatus.MINTED
    && (artwork.visibility || ArtworkVisibility.PRIVATE) === ArtworkVisibility.PUBLIC;
}
