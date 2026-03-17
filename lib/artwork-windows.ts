import { prisma } from '@/lib/prisma';
import { getNumberSetting, getStringSetting, getSiteSettingsMap } from '@/lib/site-settings';

export async function buildPublicReviewDates(startDate = new Date()) {
  const settings = await getSiteSettingsMap();
  const publicReviewHours = getNumberSetting(settings, 'public_review_hours', 48);
  const mintWindowDays = getNumberSetting(settings, 'mint_window_days', 7);
  const startedAt = new Date(startDate);
  const opensAt = new Date(startedAt.getTime() + publicReviewHours * 60 * 60 * 1000);
  const endsAt = new Date(opensAt.getTime() + mintWindowDays * 24 * 60 * 60 * 1000);
  return { publicReviewStartedAt: startedAt, mintWindowOpensAt: opensAt, mintWindowEndsAt: endsAt };
}

export async function syncExpiredPublicReviewWindows() {
  const settings = await getSiteSettingsMap();
  const nextStatus = getStringSetting(settings, 'mint_expiry_next_status', 'PENDING');
  const safeNextStatus = ['PENDING', 'REJECTED', 'ARCHIVED', 'HIDDEN'].includes(nextStatus) ? nextStatus : 'PENDING';
  await prisma.artwork.updateMany({ where: { status: { in: ['PUBLIC_REVIEW', 'MINTING'] }, mintWindowEndsAt: { lt: new Date() } }, data: { status: safeNextStatus as any } });
}

export function canMintNow(artwork: { status: string; mintWindowOpensAt: Date | null; mintWindowEndsAt: Date | null }) {
  if (!['PUBLIC_REVIEW', 'MINTING'].includes(artwork.status)) return false;
  if (!artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return false;
  const now = new Date();
  return now >= artwork.mintWindowOpensAt && now <= artwork.mintWindowEndsAt;
}

export function getMintWindowStatus(artwork: { status: string; publicReviewStartedAt: Date | null; mintWindowOpensAt: Date | null; mintWindowEndsAt: Date | null }) {
  if (!['PUBLIC_REVIEW', 'MINTING'].includes(artwork.status)) return 'not_in_public_review';
  if (!artwork.publicReviewStartedAt || !artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return 'missing_dates';
  const now = new Date();
  if (now < artwork.mintWindowOpensAt) return 'reviewing';
  if (now >= artwork.mintWindowOpensAt && now <= artwork.mintWindowEndsAt) return 'mint_open';
  return 'expired';
}

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}
