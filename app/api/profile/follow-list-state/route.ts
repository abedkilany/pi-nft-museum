import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids') || '';
  const targetIds = Array.from(
    new Set(
      idsParam
        .split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  ).slice(0, 100);

  if (targetIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'At least one target user id is required.' }, { status: 400 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: true, authenticated: false, items: targetIds.map((targetUserId) => ({
      targetUserId,
      isFollowing: false,
      followsYou: false,
      isSelf: false,
    })) });
  }

  const [mine, reverse] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: currentUser.userId, followingId: { in: targetIds } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: { in: targetIds }, followingId: currentUser.userId },
      select: { followerId: true },
    }),
  ]);

  const followingSet = new Set(mine.map((item) => item.followingId));
  const reverseSet = new Set(reverse.map((item) => item.followerId));

  return NextResponse.json({
    ok: true,
    authenticated: true,
    items: targetIds.map((targetUserId) => ({
      targetUserId,
      isFollowing: followingSet.has(targetUserId),
      followsYou: reverseSet.has(targetUserId),
      isSelf: currentUser.userId === targetUserId,
    })),
  });
}
