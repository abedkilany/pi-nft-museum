import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') === 'following' ? 'following' : 'followers';

  const [profileUser, currentUser] = await Promise.all([
    prisma.user.findUnique({ where: { username: params.username }, select: { id: true, username: true, fullName: true } }),
    getCurrentUser(),
  ]);

  if (!profileUser) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const rows = await prisma.follow.findMany({
    where: type === 'followers' ? { followingId: profileUser.id } : { followerId: profileUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      follower: { select: { id: true, username: true, fullName: true, headline: true, profileImage: true } },
      following: { select: { id: true, username: true, fullName: true, headline: true, profileImage: true } },
    },
  });

  const users = rows.map((row) => type === 'followers' ? row.follower : row.following);
  const targetIds = users.map((item) => item.id);
  let followingSet = new Set<number>();
  let reverseSet = new Set<number>();

  if (currentUser && targetIds.length > 0) {
    const [mine, reverse] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: currentUser.userId, followingId: { in: targetIds } }, select: { followingId: true } }),
      prisma.follow.findMany({ where: { followerId: { in: targetIds }, followingId: currentUser.userId }, select: { followerId: true } }),
    ]);
    followingSet = new Set(mine.map((item) => item.followingId));
    reverseSet = new Set(reverse.map((item) => item.followerId));
  }

  return NextResponse.json({
    ok: true,
    title: type === 'followers' ? `${profileUser.fullName || profileUser.username}'s followers` : `${profileUser.fullName || profileUser.username} follows`,
    items: users.map((user) => ({
      ...user,
      isFollowing: followingSet.has(user.id),
      followsYou: reverseSet.has(user.id),
      isSelf: currentUser?.userId === user.id,
    })),
  });
}
