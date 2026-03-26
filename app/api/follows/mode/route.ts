import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { FOLLOW_NOTIFY_MODES } from '@/lib/notifications';
import { assertSameOrigin } from '@/lib/security';
import { getEnumField, getNumberField, readJsonObject } from '@/lib/request-validation';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const bodyResult = await readJsonObject(request);
  if (!bodyResult.ok) return bodyResult.response;

  const targetUserIdResult = getNumberField(bodyResult.data, 'targetUserId', { required: true, integer: true, min: 1 });
  if (!targetUserIdResult.ok) return targetUserIdResult.response;

  const notifyModeResult = getEnumField(bodyResult.data, 'notifyMode', FOLLOW_NOTIFY_MODES, { required: true });
  if (!notifyModeResult.ok) return notifyModeResult.response;

  const followingId = targetUserIdResult.data;
  const notifyMode = notifyModeResult.data;

  const updated = await prisma.follow.updateMany({
    where: { followerId: currentUser.userId, followingId },
    data: { notifyMode },
  });

  if (!updated.count) {
    return NextResponse.json({ ok: false, error: 'Follow relationship not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, notifyMode });
}
