import { ArtworkStatus } from '@/types/enums';
import Image from 'next/image';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';
import { AuthAwareRatingStars } from '@/components/auth/AuthAwareRatingStars';
import { ReviewAutoRefresh } from '@/components/review/ReviewAutoRefresh';
import { formatDateTime } from '@/lib/artwork-windows';
import { getReviewStatuses } from '@/lib/domains/artworks';
import { getSiteSettingsMap } from '@/lib/site-settings';
import { getDisplayImageUrl } from '@/lib/image-url';

type ReviewArtwork = Prisma.ArtworkGetPayload<{
  select: {
    id: true;
    title: true;
    imageUrl: true;
    mintWindowOpensAt: true;
    mintWindowEndsAt: true;
    description: true;
    averageRating: true;
    ratingsCount: true;
    artist: {
      select: {
        username: true;
        fullName: true;
        artistProfile: { select: { displayName: true } };
      };
    };
    category: { select: { name: true } };
  };
}>;

export const dynamic = 'force-dynamic';

async function getReviewArtworks(reviewStatuses: ArtworkStatus[]) {
  return prisma.artwork.findMany({
    where: { status: { in: reviewStatuses }, visibility: 'PUBLIC' },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      mintWindowOpensAt: true,
      mintWindowEndsAt: true,
      description: true,
      averageRating: true,
      ratingsCount: true,
      artist: {
        select: {
          username: true,
          fullName: true,
          artistProfile: { select: { displayName: true } }
        }
      },
      category: { select: { name: true } },
    },
    orderBy: [{ mintWindowOpensAt: 'asc' }, { createdAt: 'desc' }]
  }) as Promise<ReviewArtwork[]>;
}

export default async function ReviewPage() {
  const settings = await getSiteSettingsMap();
  const reviewStatuses = getReviewStatuses(settings) as ArtworkStatus[];
  const artworks = await getReviewArtworks(reviewStatuses);

  return (
    <div className="page-stack">
      <ReviewAutoRefresh />
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Public review</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Artworks are reviewed here before Lazy Mint. They do not appear in the main gallery until Lazy Mint succeeds.</p>
      </section>
      <section className="card surface-section"><p style={{ margin: 0 }}>Log in with Pi to rate artworks during review.</p></section>
      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No artworks are currently in public review.</p></section> : (
        <section className="stack-md">
          {artworks.map((artwork) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            return (
              <article key={artwork.id} className="card split-list-card">
                <Image src={getDisplayImageUrl(artwork.imageUrl)} alt={artwork.title} width={720} height={520} unoptimized className="split-list-media" />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Lazy mint opens: {formatDateTime(artwork.mintWindowOpensAt)}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Lazy mint closes: {formatDateTime(artwork.mintWindowEndsAt)}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <div className="split-list-side"><AuthAwareRatingStars artworkId={artwork.id} currentAverage={Number(artwork.averageRating)} currentVotes={artwork.ratingsCount} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
