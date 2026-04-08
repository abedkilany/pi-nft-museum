import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

function parseUserIds(value: string | null) {
  if (!value) return [] as number[];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ).slice(0, 100);
}

export async function GET(request: NextRequest) {
  const targetUserIds = parseUserIds(request.nextUrl.searchParams.get('userIds'));
  if (targetUserIds.length === 0) {
    return NextResponse.json({ ok: true, authenticated: false, currentUserId: null, states: {} });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser?.userId) {
    return NextResponse.json({ ok: true, authenticated: false, currentUserId: null, states: {} });
  }

  const [following, reverse] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: currentUser.userId, followingId: { in: targetUserIds } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: { in: targetUserIds }, followingId: currentUser.userId },
      select: { followerId: true },
    }),
  ]);

  const followingSet = new Set(following.map((item) => item.followingId));
  const reverseSet = new Set(reverse.map((item) => item.followerId));
  const states: Record<string, { isFollowing: boolean; followsYou: boolean; isSelf: boolean }> = {};

  for (const userId of targetUserIds) {
    states[String(userId)] = {
      isFollowing: followingSet.has(userId),
      followsYou: reverseSet.has(userId),
      isSelf: currentUser.userId === userId,
    };
  }

  return NextResponse.json({ ok: true, authenticated: true, currentUserId: currentUser.userId, states });
}
