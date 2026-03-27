import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { createNotification } from '@/lib/domains/notifications';
import { assertSameOrigin } from '@/lib/services/request';
import { getNumberField, readJsonObject, validationError } from '@/lib/services/request';

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

async function readProfileUserId(request: Request) {
  const bodyResult = await readJsonObject(request);
  if (!bodyResult.ok) return bodyResult;
  const profileUserIdResult = getNumberField(bodyResult.data, 'profileUserId', { required: true, integer: true, min: 1 });
  if (!profileUserIdResult.ok) return profileUserIdResult;
  return { ok: true as const, data: profileUserIdResult.data };
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const targetIdResult = await readProfileUserId(request);
  if (!targetIdResult.ok) return targetIdResult.response;
  const targetId = targetIdResult.data;

  if (targetId === currentUser.userId) {
    return validationError('You cannot follow yourself.', { profileUserId: 'Cannot follow yourself' });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, username: true } });
  if (!target) return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });

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

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const targetIdResult = await readProfileUserId(request);
  if (!targetIdResult.ok) return targetIdResult.response;
  const targetId = targetIdResult.data;

  await prisma.follow.deleteMany({ where: { followerId: currentUser.userId, followingId: targetId } });

  return NextResponse.json({ ok: true, state: await buildState(currentUser.userId, targetId) });
}
