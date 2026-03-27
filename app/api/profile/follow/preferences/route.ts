import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { assertSameOrigin } from '@/lib/services/request';
import { getNumberField, getOptionalBooleanField, readJsonObject } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const bodyResult = await readJsonObject(request);
  if (!bodyResult.ok) return bodyResult.response;

  const profileUserIdResult = getNumberField(bodyResult.data, 'profileUserId', { required: true, integer: true, min: 1 });
  if (!profileUserIdResult.ok) return profileUserIdResult.response;
  const profileUserId = profileUserIdResult.data;

  const follow = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: currentUser.userId, followingId: profileUserId } } });
  if (!follow) return NextResponse.json({ ok: false, error: 'Follow this user first.' }, { status: 400 });

  const updated = await prisma.follow.update({
    where: { followerId_followingId: { followerId: currentUser.userId, followingId: profileUserId } },
    data: {
      notificationsEnabled: getOptionalBooleanField(bodyResult.data, 'notificationsEnabled', follow.notificationsEnabled),
      notifyAllActivity: getOptionalBooleanField(bodyResult.data, 'notifyAllActivity', follow.notifyAllActivity),
      notifyNewArtworks: getOptionalBooleanField(bodyResult.data, 'notifyNewArtworks', follow.notifyNewArtworks),
      notifyPremiumArtworks: getOptionalBooleanField(bodyResult.data, 'notifyPremiumArtworks', follow.notifyPremiumArtworks),
      notifyComments: getOptionalBooleanField(bodyResult.data, 'notifyComments', follow.notifyComments),
      muted: getOptionalBooleanField(bodyResult.data, 'muted', follow.muted),
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
