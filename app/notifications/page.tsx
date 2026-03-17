import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { NotificationsList } from '@/components/notifications/NotificationsList';

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div style={{ paddingTop: 30, display: 'grid', gap: 24 }}>
      <NotificationsList initialNotifications={notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />
    </div>
  );
}
