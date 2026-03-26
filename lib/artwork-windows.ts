export function formatDateTime(value: Date | string | number | null | undefined) {
  if (!value) return '—';

  const normalized = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(normalized.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(normalized);
}

export function getMintWindowStatus(artwork: {
  status: string;
  publicReviewStartedAt: Date | string | null;
  mintWindowOpensAt: Date | string | null;
  mintWindowEndsAt: Date | string | null;
}) {
  if (artwork.status !== 'PUBLIC_REVIEW') return 'not_in_public_review';
  if (!artwork.publicReviewStartedAt || !artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return 'missing_dates';

  const opensAt = artwork.mintWindowOpensAt instanceof Date ? artwork.mintWindowOpensAt : new Date(artwork.mintWindowOpensAt);
  const endsAt = artwork.mintWindowEndsAt instanceof Date ? artwork.mintWindowEndsAt : new Date(artwork.mintWindowEndsAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(endsAt.getTime())) return 'missing_dates';

  const now = new Date();
  if (now < opensAt) return 'reviewing';
  if (now <= endsAt) return 'mint_open';
  return 'expired';
}

export function canMintNow(artwork: { status: string; mintWindowOpensAt: Date | string | null; mintWindowEndsAt: Date | string | null }) {
  if (artwork.status !== 'PUBLIC_REVIEW') return false;
  if (!artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return false;
  const opensAt = artwork.mintWindowOpensAt instanceof Date ? artwork.mintWindowOpensAt : new Date(artwork.mintWindowOpensAt);
  const endsAt = artwork.mintWindowEndsAt instanceof Date ? artwork.mintWindowEndsAt : new Date(artwork.mintWindowEndsAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(endsAt.getTime())) return false;
  const now = new Date();
  return now >= opensAt && now <= endsAt;
}
