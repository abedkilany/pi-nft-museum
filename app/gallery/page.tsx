import Link from 'next/link';
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
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Only minted and published artworks appear here. Nothing enters the gallery before mint.</p>
      </section>

      {!user ? <section className="card" style={{ padding: '18px' }}><p style={{ margin: 0 }}>You can browse artworks freely. <Link href="/login">Login with Pi</Link> to react.</p></section> : null}

      {artworks.length === 0 ? <section className="card" style={{ padding: '24px' }}><p style={{ margin: 0 }}>No published artworks are available right now.</p></section> : (
        <section style={{ display: 'grid', gap: '16px' }}>
          {artworks.map((artwork) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            const myReaction = user && Array.isArray(artwork.reactions) && artwork.reactions.length > 0 ? artwork.reactions[0].type : null;
            return (
              <article key={artwork.id} className="card" style={{ padding: '18px', display: 'grid', gridTemplateColumns: '180px 1fr 260px', gap: '18px', alignItems: 'start' }}>
                <img src={artwork.imageUrl} alt={artwork.title} style={{ width: '180px', height: '130px', objectFit: 'cover', borderRadius: '12px' }} />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Category: {artwork.category?.name || 'General'}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Final price: {Number(artwork.price).toFixed(2)} {artwork.currency}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <ReactionButtons artworkId={artwork.id} canReact={Boolean(user)} likesCount={artwork.likesCount} dislikesCount={artwork.dislikesCount} myReaction={myReaction} />
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
