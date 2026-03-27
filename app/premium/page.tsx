import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/domains/system';
import { timeToPremium } from '@/lib/timeToPremium';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { getBooleanSetting, getSiteSettingsMap } from '@/lib/site-settings';
import { getDisplayImageUrl } from '@/lib/image-url';

const getPremiumArtworks = unstable_cache(
  async () => prisma.artwork.findMany({
    where: { status: 'PREMIUM' },
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

  const artworks = await getPremiumArtworks();

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Premium Gallery</h1>
        <p style={{ opacity: 0.8, margin: 0 }}>
          This gallery contains artworks that reached the premium threshold.
        </p>
      </div>

      {artworks.length === 0 ? (
        <div className="card" style={{ padding: '24px' }}>
          <p style={{ margin: 0 }}>No artworks have reached Premium Gallery yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '18px' }}>
          {artworks.map((art) => {
            const artistName =
              art.artist.artistProfile?.displayName ||
              art.artist.fullName ||
              art.artist.username;

            return (
              <div
                key={art.id}
                className="card"
                style={{
                  padding: '18px',
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr 260px',
                  gap: '18px',
                  alignItems: 'start'
                }}
              >
                <Image src={getDisplayImageUrl(art.imageUrl)} alt={art.title} width={180} height={130} unoptimized style={{ width: '180px', height: '130px', objectFit: 'cover', borderRadius: '12px' }} />

                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: '0 0 8px' }}>{art.title}</h3>
                    <PremiumBadge />
                  </div>

                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Category: {art.category?.name || 'General'}
                  </p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Final price: {Number(art.price).toFixed(2)} π
                  </p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Premium Score: {Number(art.premiumScore || 0).toFixed(2)}
                  </p>
                  <p style={{ margin: '0 0 6px', opacity: 0.8 }}>
                    Rating: {Number(art.averageRating).toFixed(1)}
                  </p>
                  <p style={{ margin: '0 0 10px', opacity: 0.8 }}>
                    Time to reach Premium: {timeToPremium(art.publicReviewStartedAt, art.premiumAt)}
                  </p>

                  <Link href={`/artwork/${art.id}`} className="button secondary">
                    View Artwork
                  </Link>
                </div>

                <div style={{ minWidth: '240px' }}>
                  <AuthAwareReactionButtons
                    artworkId={art.id}
                    likesCount={art.likesCount}
                    dislikesCount={art.dislikesCount}
                    myReaction={null}
                    isPremium={true}
                    premiumAllowDislike={premiumAllowDislike}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
