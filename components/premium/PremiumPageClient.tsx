'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { timeToPremium } from '@/lib/timeToPremium';
import { getDisplayImageUrl } from '@/lib/image-url';

type PremiumArtwork = {
  id: number;
  title: string;
  imageUrl: string;
  price: number;
  premiumScore: number | null;
  averageRating: number | null;
  publicReviewStartedAt: string | null;
  premiumAt: string | null;
  likesCount: number;
  dislikesCount: number;
  artist: {
    username: string;
    fullName: string | null;
    artistProfile: { displayName: string | null } | null;
  };
  category: { name: string } | null;
};

export function PremiumPageClient({ artworks, premiumAllowDislike }: { artworks: PremiumArtwork[]; premiumAllowDislike: boolean }) {
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
                    Rating: {Number(art.averageRating ?? 0).toFixed(1)}
                  </p>
                  <p style={{ margin: '0 0 10px', opacity: 0.8 }}>
                    Time to reach Premium: {timeToPremium(art.publicReviewStartedAt ? new Date(art.publicReviewStartedAt) : null, art.premiumAt ? new Date(art.premiumAt) : null)}
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
