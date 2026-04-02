import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/domains/system';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { PremiumPageClient } from '@/components/premium/PremiumPageClient';

const getPremiumArtworks = unstable_cache(
  async () => prisma.artwork.findMany({
    where: { status: 'PREMIUM', visibility: 'PUBLIC' },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      price: true,
      premiumScore: true,
      averageRating: true,
      publicReviewStartedAt: true,
      premiumAt: true,
      likesCount: true,
      dislikesCount: true,
      artist: {
        select: {
          username: true,
          fullName: true,
          artistProfile: { select: { displayName: true } }
        }
      },
      category: { select: { name: true } },
    },
    orderBy: { premiumScore: 'desc' }
  }),
  ['premium-artworks'],
  { revalidate: 30 }
);

export default async function PremiumPage() {
  const settings = await getSiteSettingsMap();
  const premiumAllowDislike = getBooleanSetting(settings, 'premium_allow_dislike', false);
  const artworksRaw = await getPremiumArtworks();
  const artworks = artworksRaw.map((art) => ({
    ...art,
    price: Number(art.price),
    premiumScore: art.premiumScore == null ? null : Number(art.premiumScore),
    averageRating: art.averageRating == null ? null : Number(art.averageRating),
    publicReviewStartedAt: art.publicReviewStartedAt ? art.publicReviewStartedAt.toISOString() : null,
    premiumAt: art.premiumAt ? art.premiumAt.toISOString() : null,
  }));

  return <PremiumPageClient artworks={artworks} premiumAllowDislike={premiumAllowDislike} />;
}
