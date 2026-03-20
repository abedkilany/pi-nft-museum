import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { createNotification } from '@/lib/notifications';
import { isCommunityEnabled } from '@/lib/community-access';
import { applyRateLimit, assertSameOrigin } from '@/lib/security';

async function buildState(currentUserId: number, profileUserId: number) {
  const [follow, followersCount, followingCount] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: currentUserId, followingId: profileUserId } } }),
    prisma.follow.count({ where: { followingId: profileUserId } }),
    prisma.follow.count({ where: { followerId: profileUserId } }),
  ]);

  return {
    isFollowing: Boolean(follow),
    followersCount,
    followingCount,
    preferences: follow
      ? {
          notificationsEnabled: follow.notificationsEnabled,
          notifyAllActivity: follow.notifyAllActivity,
          notifyNewArtworks: follow.notifyNewArtworks,
          notifyPremiumArtworks: follow.notifyPremiumArtworks,
          notifyComments: follow.notifyComments,
          muted: follow.muted,
        }
      : null,
  };
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  if (!(await isCommunityEnabled())) {
    return NextResponse.json({ error: 'Community is currently disabled.' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'profile-follow-write', [
    { limit: 20, windowMs: 60 * 1000 },
    { limit: 100, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const { profileUserId } = await request.json();
  const targetId = Number(profileUserId);
  if (!targetId) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 });
  if (targetId === currentUser.userId) return NextResponse.json({ error: 'You cannot follow yourself.' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, username: true } });
  if (!target) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: currentUser.userId, followingId: targetId } },
    update: {
      notificationsEnabled: true,
      notifyAllActivity: true,
      notifyNewArtworks: true,
      notifyPremiumArtworks: true,
      notifyComments: true,
      muted: false,
    },
    create: { followerId: currentUser.userId, followingId: targetId },
  });

  await createNotification({
    userId: targetId,
    type: 'follow',
    title: 'New follower',
    message: `@${currentUser.username} started following you.`,
  });

  return NextResponse.json({ ok: true, state: await buildState(currentUser.userId, targetId) });
}

export async function DELETE(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  if (!(await isCommunityEnabled())) {
    return NextResponse.json({ error: 'Community is currently disabled.' }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const rateLimitError = applyRateLimit(request, [currentUser.userId], 'profile-follow-delete', [
    { limit: 20, windowMs: 60 * 1000 },
    { limit: 100, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const { profileUserId } = await request.json();
  const targetId = Number(profileUserId);
  if (!targetId) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 });

  await prisma.follow.deleteMany({ where: { followerId: currentUser.userId, followingId: targetId } });

  return NextResponse.json({ ok: true, state: await buildState(currentUser.userId, targetId) });
}
