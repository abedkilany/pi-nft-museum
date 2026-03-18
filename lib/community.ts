import { prisma } from '@/lib/prisma';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';

export async function isCommunityEnabled() {
  const settings = await getSiteSettingsMap();
  return getBooleanSetting(settings, 'community_enabled', true);
}

export async function assertCommunityEnabled() {
  const enabled = await isCommunityEnabled();
  if (!enabled) throw new Error('Community features are currently disabled.');
}

export async function createNotification(input: { userId: number; type: string; title: string; message: string; linkUrl?: string; }) {
  return prisma.notification.create({ data: { userId: input.userId, type: input.type, title: input.title, message: input.message, linkUrl: input.linkUrl } });
}

export async function createCommunityActivity(input: { actorId: number; subjectUserId?: number | null; type: string; title: string; message: string; linkUrl?: string; }) {
  const enabled = await isCommunityEnabled();
  if (!enabled) return null;
  return prisma.communityActivity.create({ data: { actorId: input.actorId, subjectUserId: input.subjectUserId ?? null, type: input.type, title: input.title, message: input.message, linkUrl: input.linkUrl } });
}

export function formatTimeAgo(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
