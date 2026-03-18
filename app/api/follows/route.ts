import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { assertCommunityEnabled, createCommunityActivity } from '@/lib/community';
import { createNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  await assertCommunityEnabled();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const targetUserId = Number(body.targetUserId ?? body.followingId ?? body.profileUserId);
  const action = String(body.action || '').toLowerCase();

  if (!targetUserId || targetUserId === currentUser.userId) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, fullName: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUser.userId,
        followingId: targetUserId,
      },
    },
  });

  const shouldUnfollow = action === 'unfollow' || Boolean(existing && action !== 'follow');

  if (shouldUnfollow && existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, following: false, action: 'unfollowed' });
  }

  if (!existing) {
    await prisma.follow.create({
      data: {
        followerId: currentUser.userId,
        followingId: targetUserId,
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
        userId: targetUserId,
        type: 'FOLLOW',
        title: 'New follower',
        message: `@${currentUser.username} started following you.`,
        linkUrl: `/profile/${currentUser.username}`,
      }),
      createCommunityActivity({
        actorId: currentUser.userId,
        subjectUserId: targetUserId,
        type: 'FOLLOW',
        title: 'Started following',
        message: `@${currentUser.username} started following @${targetUser.username}.`,
        linkUrl: `/profile/${targetUser.username}`,
      }),
    ]);
  } else {
    await prisma.follow.update({
      where: { id: existing.id },
      data: {
        notificationsEnabled: true,
        notifyAllActivity: true,
        notifyNewArtworks: true,
        notifyPremiumArtworks: true,
        notifyComments: true,
        muted: false,
        notifyMode: 'ALL',
      },
    });
  }

  return NextResponse.json({ ok: true, following: true, action: 'followed' });
}
