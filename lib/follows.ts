import { prisma } from '@/lib/prisma';

export async function getFollowState(currentUserId: number | null, targetUserId: number) {
  if (!currentUserId || currentUserId === targetUserId) {
    return {
      isFollowing: false,
      followsYou: false,
      isSelf: currentUserId === targetUserId,
    };
  }

  const [direct, reverse] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: currentUserId,
        },
      },
    }),
  ]);

  return {
    isFollowing: Boolean(direct),
    followsYou: Boolean(reverse),
    isSelf: false,
  };
}

export async function getFollowCounts(userId: number) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return { followers, following };
}
