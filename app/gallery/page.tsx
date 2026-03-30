import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { ReactionFilterBar } from '@/components/gallery/ReactionFilterBar';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { getDisplayImageUrl } from '@/lib/image-url';
import { GalleryAutoRefresh } from '@/components/gallery/GalleryAutoRefresh';
import { getArtworkMintStatusLabel } from '@/lib/domains/artworks';

export const dynamic = 'force-dynamic';

async function getGalleryArtworks() {
  return prisma.artwork.findMany({
    where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      price: true,
      currency: true,
      description: true,
      listingType: true,
      mintStatus: true,
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
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
  });
}

export default async function GalleryPage() {
  const [artworks, currentUser] = await Promise.all([
    getGalleryArtworks(),
    getCurrentUser(),
  ]);

  const reactionMap = new Map<number, 'LIKE' | 'DISLIKE'>();

  if (currentUser && artworks.length > 0) {
    const reactions = await prisma.artworkReaction.findMany({
      where: {
        userId: currentUser.userId,
        artworkId: { in: artworks.map((artwork) => artwork.id) },
      },
      select: {
        artworkId: true,
        type: true,
      },
    });

    for (const reaction of reactions) {
      reactionMap.set(reaction.artworkId, reaction.type);
    }
  }

  return (
    <div className="page-stack">
      <GalleryAutoRefresh />
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Approved artworks that passed review and are now visible to the public gallery.</p>
      </section>

      <ReactionFilterBar />

      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No published artworks are available right now.</p></section> : (
        <section className="stack-md">
          {artworks.map((artwork) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            return (
              <article key={artwork.id} className="card split-list-card">
                <Image src={getDisplayImageUrl(artwork.imageUrl)} alt={artwork.title} width={720} height={520} unoptimized className="split-list-media" />
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{artwork.title}</h3>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Artist: {artistName}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Category: {artwork.category?.name || 'General'}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Availability: {artwork.listingType === 'FIXED_PRICE' ? 'For sale' : artwork.listingType === 'AUCTION' ? 'Auction' : 'Not for sale'}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Chain: {getArtworkMintStatusLabel(artwork.mintStatus || 'UNMINTED')}</p>
                  <p style={{ margin: '0 0 6px', color: 'var(--muted)' }}>Final price: {Number(artwork.price).toFixed(2)} {artwork.currency}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <div className="split-list-side"><AuthAwareReactionButtons artworkId={artwork.id} likesCount={artwork.likesCount} dislikesCount={artwork.dislikesCount} myReaction={reactionMap.get(artwork.id) ?? null} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
