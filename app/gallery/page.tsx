import Link from 'next/link';
import { PiConnectButton } from '@/components/PiConnectButton';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { ReactionButtons } from '@/components/reactions/ReactionButtons';
import { getGalleryStatuses } from '@/lib/artwork-workflow';
import { getSiteSettingsMap } from '@/lib/site-settings';

export default async function GalleryPage() {
  const user = await getCurrentUser();
  const settings = await getSiteSettingsMap();
  const galleryStatuses = getGalleryStatuses(settings);
  const artworks = await prisma.artwork.findMany({
    where: { status: { in: galleryStatuses as any } },
    include: {
      artist: { include: { artistProfile: true } },
      category: true,
      reactions: user ? { where: { userId: user.userId }, take: 1 } : false
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
  });

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Only minted and published artworks appear here. Nothing enters the gallery before mint.</p>
      </section>

      {!user ? <section className="card surface-section"><div className="card-actions" style={{ marginTop: 0 }}><p style={{ margin: 0 }}>You can browse artworks freely. Log in with Pi to react.</p><PiConnectButton className="button primary">Connect with Pi</PiConnectButton></div></section> : null}

      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No published artworks are available right now.</p></section> : (
        <section className="stack-md">
          {artworks.map((artwork: any) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            const myReaction = user && Array.isArray(artwork.reactions) && artwork.reactions.length > 0 ? artwork.reactions[0].type : null;
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
                <div className="split-list-side"><ReactionButtons artworkId={artwork.id} canReact={Boolean(user)} likesCount={artwork.likesCount} dislikesCount={artwork.dislikesCount} myReaction={myReaction} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
