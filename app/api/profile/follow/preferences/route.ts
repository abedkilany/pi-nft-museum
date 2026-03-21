import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json();
  const profileUserId = Number(body.profileUserId);
  if (!profileUserId) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 });

  const follow = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: currentUser.userId, followingId: profileUserId } } });
  if (!follow) return NextResponse.json({ error: 'Follow this user first.' }, { status: 400 });

  const updated = await prisma.follow.update({
    where: { followerId_followingId: { followerId: currentUser.userId, followingId: profileUserId } },
    data: {
      notificationsEnabled: Boolean(body.notificationsEnabled),
      notifyAllActivity: Boolean(body.notifyAllActivity),
      notifyNewArtworks: Boolean(body.notifyNewArtworks),
      notifyPremiumArtworks: Boolean(body.notifyPremiumArtworks),
      notifyComments: Boolean(body.notifyComments),
      muted: Boolean(body.muted),
    },
  });

  return NextResponse.json({
    ok: true,
    preferences: {
      notificationsEnabled: updated.notificationsEnabled,
      notifyAllActivity: updated.notifyAllActivity,
      notifyNewArtworks: updated.notifyNewArtworks,
      notifyPremiumArtworks: updated.notifyPremiumArtworks,
      notifyComments: updated.notifyComments,
      muted: updated.muted,
    },
  });
}