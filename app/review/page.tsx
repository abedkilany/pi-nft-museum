import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { RatingStars } from '@/components/ratings/RatingStars';
import { formatDateTime } from '@/lib/artwork-windows';
import { getReviewStatuses } from '@/lib/artwork-workflow';
import { getSiteSettingsMap } from '@/lib/site-settings';

export default async function ReviewPage() {
  const user = await getCurrentUser();
  const settings = await getSiteSettingsMap();
  const reviewStatuses = getReviewStatuses(settings);
  const artworks = await prisma.artwork.findMany({
    where: { status: { in: reviewStatuses as any } },
    include: {
      artist: { include: { artistProfile: true } },
      category: true,
      ratings: user ? { where: { userId: user.userId }, take: 1 } : false
    },
    orderBy: [{ mintWindowOpensAt: 'asc' }, { createdAt: 'desc' }]
  });

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Public review</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Artworks are reviewed here before mint. They do not appear in the main gallery until mint succeeds.</p>
      </section>
      {!user ? <section className="card surface-section"><p style={{ margin: 0 }}>Login with Pi to rate artworks during review.</p></section> : null}
      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No artworks are currently in public review.</p></section> : (
        <section className="stack-md">
          {artworks.map((artwork: any) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            return (
              <article key={artwork.id} className="card split-list-card">
                <img src={artwork.imageUrl} alt={artwork.title} className="split-list-media" />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Mint opens: {formatDateTime(artwork.mintWindowOpensAt)}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Mint closes: {formatDateTime(artwork.mintWindowEndsAt)}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <div className="split-list-side"><RatingStars artworkId={artwork.id} canRate={Boolean(user)} currentAverage={Number(artwork.averageRating)} currentVotes={artwork.ratingsCount} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
