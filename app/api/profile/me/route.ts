import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowCounts } from '@/lib/follows';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { privateProfileUserSelect } from '@/lib/profile';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: privateProfileUserSelect,
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const [counts, unreadNotifications, recentNotifications, totals] = await Promise.all([
    getFollowCounts(user.id),
    getUnreadNotificationCount(user.id),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        message: true,
        linkUrl: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.artwork.groupBy({
      by: ['status'],
      where: { artistId: user.id },
      _count: { status: true },
    }),
  ]);

  const artworkTotals = totals.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    user,
    counts,
    unreadNotifications,
    recentNotifications,
    artworkTotals: {
      total: Object.values(artworkTotals).reduce((sum, value) => sum + value, 0),
      published: artworkTotals.PUBLISHED || 0,
      premium: artworkTotals.PREMIUM || 0,
      underReview: artworkTotals.UNDER_REVIEW || 0,
      rejected: artworkTotals.REJECTED || 0,
      drafted: artworkTotals.DRAFT || 0,
      minted: artworkTotals.MINTED || 0,
    },
  });
}
