const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncCommunityPostCounts() {
  const posts = await prisma.communityPost.findMany({ select: { id: true } });
  for (const post of posts) {
    const [likesCount, commentsCount] = await Promise.all([
      prisma.communityPostLike.count({ where: { postId: post.id } }),
      prisma.communityPostComment.count({ where: { postId: post.id } }),
    ]);

    await prisma.communityPost.update({
      where: { id: post.id },
      data: { likesCount, commentsCount },
    });
  }

  return posts.length;
}

async function syncArtworkCounts() {
  const artworks = await prisma.artwork.findMany({ select: { id: true } });
  for (const artwork of artworks) {
    const [ratingAggregate, likesCount, dislikesCount] = await Promise.all([
      prisma.rating.aggregate({
        where: { artworkId: artwork.id },
        _avg: { value: true },
        _count: { value: true },
      }),
      prisma.artworkReaction.count({ where: { artworkId: artwork.id, type: 'LIKE' } }),
      prisma.artworkReaction.count({ where: { artworkId: artwork.id, type: 'DISLIKE' } }),
    ]);

    await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        averageRating: Number(ratingAggregate._avg.value ?? 0),
        ratingsCount: ratingAggregate._count.value ?? 0,
        likesCount,
        dislikesCount,
      },
    });
  }

  return artworks.length;
}

async function main() {
  const [posts, artworks] = await Promise.all([
    syncCommunityPostCounts(),
    syncArtworkCounts(),
  ]);

  console.log(`Resynced counts for ${posts} community posts and ${artworks} artworks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
