import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap } from '@/lib/site-settings';
import { recalculateArtworkEngagement } from '@/lib/artwork-workflow';

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function getFollowCounts(userId: number, db: DbClient = prisma) {
  const [followers, following] = await Promise.all([
    db.follow.count({ where: { followingId: userId } }),
    db.follow.count({ where: { followerId: userId } }),
  ]);

  return { followers, following };
}

export async function getCommunityPostCounts(postId: number, db: DbClient = prisma) {
  const [likesCount, commentsCount] = await Promise.all([
    db.communityPostLike.count({ where: { postId } }),
    db.communityPostComment.count({ where: { postId } }),
  ]);

  return { likesCount, commentsCount };
}

export async function syncCommunityPostCounts(postId: number, db: DbClient = prisma) {
  const counts = await getCommunityPostCounts(postId, db);

  await db.communityPost.update({
    where: { id: postId },
    data: counts,
  });

  return counts;
}

export async function syncArtworkEngagementCounts(artworkId: number) {
  const settings = await getSiteSettingsMap();
  const artwork = await recalculateArtworkEngagement(artworkId, settings);

  return {
    averageRating: Number(artwork.averageRating ?? 0),
    ratingsCount: Number(artwork.ratingsCount ?? 0),
    likesCount: Number(artwork.likesCount ?? 0),
    dislikesCount: Number(artwork.dislikesCount ?? 0),
    premiumScore: Number(artwork.premiumScore ?? 0),
    status: artwork.status,
  };
}

export async function syncAllCommunityPostCounts() {
  const posts = await prisma.communityPost.findMany({ select: { id: true } });
  for (const post of posts) {
    await syncCommunityPostCounts(post.id);
  }
  return posts.length;
}

export async function syncAllArtworkEngagementCounts() {
  const artworks = await prisma.artwork.findMany({ select: { id: true } });
  for (const artwork of artworks) {
    await syncArtworkEngagementCounts(artwork.id);
  }
  return artworks.length;
}
