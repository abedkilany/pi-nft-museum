import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function POST() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: currentUser.userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
