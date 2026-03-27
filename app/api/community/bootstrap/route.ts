import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: true, myArtworks: [], followingIds: [], followerIds: [] });
  }

  const [myArtworks, following, followers] = await Promise.all([
    prisma.artwork.findMany({
      where: { artistUserId: currentUser.userId },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 12,
      select: { id: true, title: true, status: true },
    }),
    prisma.follow.findMany({
      where: { followerId: currentUser.userId },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: currentUser.userId },
      select: { followerId: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    myArtworks,
    followingIds: following.map((item) => item.followingId),
    followerIds: followers.map((item) => item.followerId),
  });
}
