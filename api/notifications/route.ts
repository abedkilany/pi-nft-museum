import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { getRecentNotifications, getUnreadNotificationCount } from '@/lib/notifications';

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const take = Number(searchParams.get('take') || 8);
  const notifications = await getRecentNotifications(currentUser.userId, Math.min(Math.max(take, 1), 50));
  const unreadCount = await getUnreadNotificationCount(currentUser.userId);
  return NextResponse.json({ notifications, unreadCount });
}
