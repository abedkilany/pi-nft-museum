import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { FOLLOW_NOTIFY_MODES } from '@/lib/notifications';
import { isCommunityEnabled } from '@/lib/community-access';

export async function POST(request: Request) {
  if (!(await isCommunityEnabled())) {
    return NextResponse.json({ error: 'Community is currently disabled.' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { targetUserId, notifyMode } = await request.json();
  const followingId = Number(targetUserId);
  if (!followingId || !FOLLOW_NOTIFY_MODES.includes(String(notifyMode) as any)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const updated = await prisma.follow.updateMany({
    where: { followerId: currentUser.userId, followingId },
    data: { notifyMode: String(notifyMode) },
  });

  if (!updated.count) {
    return NextResponse.json({ error: 'Follow relationship not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
