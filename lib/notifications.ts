import { prisma } from '@/lib/prisma';

export const FOLLOW_NOTIFY_MODES = ['ALL', 'ARTWORKS', 'PREMIUM', 'COMMENTS', 'MUTE'] as const;
export type FollowNotifyMode = (typeof FOLLOW_NOTIFY_MODES)[number];

type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function getUnreadNotificationCount(userId: number) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function getRecentNotifications(userId: number, take = 8) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

export async function shouldSendFollowNotification(options: {
  followerId: number;
  targetUserId: number;
  eventType: 'COMMENTS' | 'ARTWORKS' | 'PREMIUM' | 'ALL';
}) {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: options.followerId,
        followingId: options.targetUserId,
      },
    },
    select: { notifyMode: true },
  });

  if (!follow) return false;
  if (follow.notifyMode === 'MUTE') return false;
  if (follow.notifyMode === 'ALL') return true;
  return follow.notifyMode === options.eventType;
}
