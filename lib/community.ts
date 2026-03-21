import { prisma } from '@/lib/prisma';

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
    },
  });
}

export async function createCommunityActivity(input: {
  actorId: number;
  subjectUserId?: number | null;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  return prisma.communityActivity.create({
    data: {
      actorId: input.actorId,
      subjectUserId: input.subjectUserId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl,
    },
  });
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

export function scoreCommunityPost(input: {
  createdAt: Date | string;
  likesCount?: number;
  commentsCount?: number;
  linkedArtwork?: boolean;
}) {
  const createdAt = typeof input.createdAt === 'string' ? new Date(input.createdAt) : input.createdAt;
  const ageHours = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
  const freshnessBoost = Math.max(0, 36 - ageHours) / 3;
  const likeScore = (input.likesCount ?? 0) * 2;
  const commentScore = (input.commentsCount ?? 0) * 3;
  const artworkBoost = input.linkedArtwork ? 4 : 0;
  return Number((likeScore + commentScore + freshnessBoost + artworkBoost).toFixed(2));
}

export function scoreCreator(input: {
  posts: number;
  artworks: number;
  followers: number;
  totalPostLikes?: number;
  totalPostComments?: number;
  lastPostAt?: Date | string | null;
}) {
  const likes = input.totalPostLikes ?? 0;
  const comments = input.totalPostComments ?? 0;
  const base = (input.posts * 5) + (input.artworks * 8) + (input.followers * 3) + likes + (comments * 2);

  if (!input.lastPostAt) {
    return base;
  }

  const lastPostAt = typeof input.lastPostAt === 'string' ? new Date(input.lastPostAt) : input.lastPostAt;
  const ageHours = Math.max(0, (Date.now() - lastPostAt.getTime()) / (1000 * 60 * 60));
  const recencyBoost = Math.max(0, 72 - ageHours) / 6;
  return Number((base + recencyBoost).toFixed(2));
}
