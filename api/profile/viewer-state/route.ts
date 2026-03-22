import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowState } from '@/lib/follows';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username) {
    return NextResponse.json({ ok: false, error: 'Username is required.' }, { status: 400 });
  }

  const [targetUser, currentUser] = await Promise.all([
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    getCurrentUser(),
  ]);

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
  }

  const followState = await getFollowState(currentUser?.userId ?? null, targetUser.id);

  return NextResponse.json({
    ok: true,
    authenticated: Boolean(currentUser),
    currentUserId: currentUser?.userId ?? null,
    isSelf: followState.isSelf,
    isFollowing: followState.isFollowing,
    followsYou: followState.followsYou,
  });
}
