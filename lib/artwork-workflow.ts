import { ArtworkStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  calculatePremiumScoreFromSettings,
  getArraySetting,
  getBooleanSetting,
  getMintWindowDays,
  getPublicReviewHours,
  getSiteSettingsMap,
  getStringSetting,
  isEligibleForPremium,
  type SiteSettingsMap
} from '@/lib/site-settings';

export const ADMIN_REVIEW_ACTIONS = ['APPROVED', 'REJECTED', 'HIDDEN', 'PENDING'] as const;
export type AdminReviewAction = (typeof ADMIN_REVIEW_ACTIONS)[number];

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function buildUniqueArtworkSlug(title: string, artworkIdToIgnore?: number) {
  const baseSlug = slugify(title) || 'artwork';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.artwork.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === artworkIdToIgnore) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function findOrCreateCategory(categoryName: string | null | undefined) {
  const normalized = String(categoryName ?? '').trim();
  if (!normalized) return null;

  const slug = slugify(normalized);
  return prisma.artworkCategory.upsert({
    where: { slug },
    update: { name: normalized },
    create: {
      name: normalized,
      slug,
      description: `${normalized} artworks`
    }
  });
}

export async function buildPublicReviewDates(startDate = new Date(), settings?: SiteSettingsMap) {
  const resolvedSettings = settings ?? (await getSiteSettingsMap());
  const publicReviewHours = getPublicReviewHours(resolvedSettings);
  const mintWindowDays = getMintWindowDays(resolvedSettings);

  const publicReviewStartedAt = new Date(startDate);
  const mintWindowOpensAt = new Date(publicReviewStartedAt.getTime() + publicReviewHours * 60 * 60 * 1000);
  const mintWindowEndsAt = new Date(mintWindowOpensAt.getTime() + mintWindowDays * 24 * 60 * 60 * 1000);

  return { publicReviewStartedAt, mintWindowOpensAt, mintWindowEndsAt };
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

export function formatDateTime(value: Date | string | number | null | undefined) {
  if (!value) return '—';

  const normalized = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(normalized.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(normalized);
}

export function getReviewStatuses(settings: SiteSettingsMap) {
  return getArraySetting(settings, 'review_page_statuses', ['PUBLIC_REVIEW']);
}

export function getGalleryStatuses(settings: SiteSettingsMap) {
  return getArraySetting(settings, 'gallery_public_statuses', ['PUBLISHED']);
}

export function getPremiumGalleryStatuses(settings: SiteSettingsMap) {
  return getArraySetting(settings, 'premium_gallery_statuses', ['PREMIUM']);
}

export function arePublicReviewReactionsAllowed(settings: SiteSettingsMap) {
  return getBooleanSetting(settings, 'allow_public_review_reactions', true);
}

export function getMintExpiryNextStatus(settings: SiteSettingsMap): ArtworkStatus {
  const allowed: ArtworkStatus[] = ['PENDING', 'REJECTED', 'ARCHIVED', 'HIDDEN'];
  const configured = getStringSetting(settings, 'mint_expiry_next_status', 'PENDING') as ArtworkStatus;
  return allowed.includes(configured) ? configured : 'PENDING';
}

export async function syncExpiredPublicReviewWindows(settings?: SiteSettingsMap) {
  const resolvedSettings = settings ?? (await getSiteSettingsMap());
  const nextStatus = getMintExpiryNextStatus(resolvedSettings);

  await prisma.artwork.updateMany({
    where: {
      status: 'PUBLIC_REVIEW',
      mintWindowEndsAt: { lt: new Date() }
    },
    data: {
      status: nextStatus
    }
  });
}

export async function resolveAdminStatusUpdate(action: AdminReviewAction, settings?: SiteSettingsMap) {
  if (action !== 'APPROVED') {
    return {
      status: action as Exclude<ArtworkStatus, 'APPROVED'>,
      reviewDates: null
    };
  }

  const reviewDates = await buildPublicReviewDates(new Date(), settings);

  return {
    status: 'PUBLIC_REVIEW' as ArtworkStatus,
    reviewDates
  };
}

export async function recalculateArtworkEngagement(artworkId: number, settings?: SiteSettingsMap) {
  const resolvedSettings = settings ?? (await getSiteSettingsMap());

  const [ratingAggregate, likesCount, dislikesCount] = await prisma.$transaction([
    prisma.rating.aggregate({
      where: { artworkId },
      _avg: { value: true },
      _count: { value: true }
    }),
    prisma.artworkReaction.count({
      where: { artworkId, type: 'LIKE' }
    }),
    prisma.artworkReaction.count({
      where: { artworkId, type: 'DISLIKE' }
    })
  ]);

  const averageRating = ratingAggregate._avg.value ?? 0;
  const ratingsCount = ratingAggregate._count.value ?? 0;
  const premiumScore = calculatePremiumScoreFromSettings(likesCount, dislikesCount, Number(averageRating), resolvedSettings);

  const existingArtwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { status: true, premiumAt: true }
  });

  if (!existingArtwork) {
    throw new Error('Artwork not found while recalculating engagement.');
  }

  const shouldBecomePremium = isEligibleForPremium(premiumScore, resolvedSettings);

  const data: Prisma.ArtworkUpdateInput = {
    likesCount,
    dislikesCount,
    averageRating: Number(averageRating),
    ratingsCount,
    premiumScore,
    premiumAt: shouldBecomePremium ? existingArtwork.premiumAt ?? new Date() : existingArtwork.premiumAt,
    status: shouldBecomePremium ? 'PREMIUM' : existingArtwork.status
  };

  return prisma.artwork.update({
    where: { id: artworkId },
    data
  });
}
