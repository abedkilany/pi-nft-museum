import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { prisma } from '@/lib/domains/system';
import { FOLLOW_NOTIFY_MODES } from '@/lib/domains/notifications';
import { assertSameOrigin } from '@/lib/services/request';
import { getEnumField, getNumberField, readJsonObject } from '@/lib/services/request';

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
