import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { createCommunityActivity } from '@/lib/community';
import { createNotification } from '@/lib/notifications';
import { isCommunityEnabled } from '@/lib/community-access';

export async function POST(request: Request) {
  if (!(await isCommunityEnabled())) {
    return NextResponse.json({ error: 'Community is currently disabled.' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { targetUserId } = await request.json();
  const followingId = Number(targetUserId);
  if (!followingId || followingId === currentUser.userId) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true, username: true } });
  if (!targetUser) {
    return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: currentUser.userId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, following: false, notifyMode: 'ALL' });
  }

  await prisma.follow.create({
    data: {
      followerId: currentUser.userId,
      followingId,
      notifyMode: 'ALL',
      notificationsEnabled: true,
      notifyAllActivity: true,
      notifyNewArtworks: true,
      notifyPremiumArtworks: true,
      notifyComments: true,
      muted: false,
    },
  });

  await Promise.all([
    createNotification({
      userId: followingId,
      type: 'FOLLOW',
      title: 'New follower',
      message: `@${currentUser.username} started following you.`,
      linkUrl: `/profile/${currentUser.username}`,
    }),
    createCommunityActivity({
      actorId: currentUser.userId,
      subjectUserId: followingId,
      type: 'FOLLOW',
      title: 'Started following',
      message: `@${currentUser.username} started following @${targetUser.username}.`,
      linkUrl: `/profile/${targetUser.username}`,
    }),
  ]);

  return NextResponse.json({ ok: true, following: true, notifyMode: 'ALL' });
}
