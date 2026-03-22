import Link from 'next/link';
import { GalleryLoginNotice } from '@/components/gallery/GalleryLoginNotice';
import { prisma } from '@/lib/prisma';
import { ReactionButtons } from '@/components/reactions/ReactionButtons';
import { getGalleryStatuses } from '@/lib/artwork-workflow';
import { getSiteSettingsMap } from '@/lib/site-settings';

export default async function GalleryPage() {
  const settings = await getSiteSettingsMap();
  const galleryStatuses = getGalleryStatuses(settings);
  const artworks = await prisma.artwork.findMany({
    where: { status: { in: galleryStatuses as any } },
    include: {
      artist: { include: { artistProfile: true } },
      category: true,
      reactions: false
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
  });

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Only minted and published artworks appear here. Nothing enters the gallery before mint.</p>
      </section>

      <GalleryLoginNotice initiallyAuthenticated={false} />

      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No published artworks are available right now.</p></section> : (
        <section className="stack-md">
          {artworks.map((artwork: any) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            const myReaction = null;
            return (
              <article key={artwork.id} className="card split-list-card">
                <img src={artwork.imageUrl} alt={artwork.title} className="split-list-media" />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Category: {artwork.category?.name || 'General'}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Final price: {Number(artwork.price).toFixed(2)} {artwork.currency}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <div className="split-list-side"><ReactionButtons artworkId={artwork.id} canReact={false} likesCount={artwork.likesCount} dislikesCount={artwork.dislikesCount} myReaction={myReaction} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
