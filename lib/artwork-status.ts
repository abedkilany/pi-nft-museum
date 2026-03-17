export const ARTWORK_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  PUBLIC_REVIEW: 'Public review',
  MINTING: 'Mint window open',
  PUBLISHED: 'Published',
  PREMIUM: 'Premium',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
  HIDDEN: 'Hidden',
  SOLD: 'Sold'
};

export const GALLERY_VISIBLE_STATUSES = ['PUBLISHED', 'PREMIUM'];
export const REVIEW_VISIBLE_STATUSES = ['PUBLIC_REVIEW', 'MINTING'];

export function getArtworkStatusLabel(status: string) {
  return ARTWORK_STATUS_LABELS[status] || status;
}

export function canAppearInMainGallery(status: string) {
  return GALLERY_VISIBLE_STATUSES.includes(status);
}

export function canReceiveRatings(status: string) {
  return REVIEW_VISIBLE_STATUSES.includes(status);
}

export function canReceiveReactions(status: string) {
  return GALLERY_VISIBLE_STATUSES.includes(status);
}
