import 'server-only';

export function buildPublicReviewDates(start: Date, reviewDays: number, mintDays: number) {
  const publicReviewStartedAt = start;

  const mintWindowOpensAt = new Date(start);
  mintWindowOpensAt.setDate(mintWindowOpensAt.getDate() + reviewDays);

  const mintWindowEndsAt = new Date(mintWindowOpensAt);
  mintWindowEndsAt.setDate(mintWindowEndsAt.getDate() + mintDays);

  return {
    publicReviewStartedAt,
    mintWindowOpensAt,
    mintWindowEndsAt,
  };
}

export async function syncExpiredPublicReviewWindows(prisma: any) {
  const now = new Date();

  const expired = await prisma.artwork.findMany({
    where: {
      status: 'PUBLIC_REVIEW',
      mintWindowEndsAt: {
        lt: now,
      },
    },
  });

  for (const art of expired) {
    await prisma.artwork.update({
      where: { id: art.id },
      data: {
        status: 'REVIEW_ENDED',
      },
    });
  }

  return expired.length;
}
