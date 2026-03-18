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
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <h1 style={{ margin: '0 0 8px' }}>Public review</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Artworks are reviewed here before mint. They do not appear in the main gallery until mint succeeds.</p>
      </section>
      {!user ? <section className="card" style={{ padding: '18px' }}><p style={{ margin: 0 }}>Login with Pi to rate artworks during review.</p></section> : null}
      {artworks.length === 0 ? <section className="card" style={{ padding: '24px' }}><p style={{ margin: 0 }}>No artworks are currently in public review.</p></section> : (
        <section style={{ display: 'grid', gap: '16px' }}>
          {artworks.map((artwork) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            return (
              <article key={artwork.id} className="card" style={{ padding: '18px', display: 'grid', gridTemplateColumns: '180px 1fr 260px', gap: '18px', alignItems: 'start' }}>
                <img src={artwork.imageUrl} alt={artwork.title} style={{ width: '180px', height: '130px', objectFit: 'cover', borderRadius: '12px' }} />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Mint opens: {formatDateTime(artwork.mintWindowOpensAt)}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Mint closes: {formatDateTime(artwork.mintWindowEndsAt)}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <RatingStars artworkId={artwork.id} canRate={Boolean(user)} currentAverage={Number(artwork.averageRating)} currentVotes={artwork.ratingsCount} />
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
