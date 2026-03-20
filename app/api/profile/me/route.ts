import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowCounts } from '@/lib/follows';
import { getUnreadNotificationCount } from '@/lib/notifications';

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    include: {
      role: true,
      artworks: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { category: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'User not found.' },
      { status: 404 }
    );
  }

  const [counts, userCounts, unreadNotifications, recentNotifications] =
    await Promise.all([
      getFollowCounts(user.id),
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          _count: {
            select: {
              artworks: true,
            },
          },
        },
      }),
      getUnreadNotificationCount(user.id),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

  const artworkCount = userCounts?._count.artworks ?? 0;

  return NextResponse.json({
    ok: true,
    user,
    counts: {
      ...counts,
      artworks: artworkCount,
    },
    unreadNotifications,
    recentNotifications,
  });
}