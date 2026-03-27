import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { getFollowCounts } from '@/lib/domains/community';
import { getUnreadNotificationCount } from '@/lib/domains/notifications';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
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
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const [_counts, unreadNotifications, recentNotifications] = await Promise.all([
    getFollowCounts(user.id),
    getUnreadNotificationCount(user.id),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  return NextResponse.json({
    ok: true,
    user,
    _counts,
    unreadNotifications,
    recentNotifications,
  });
}
