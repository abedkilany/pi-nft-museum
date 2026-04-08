import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/domains/system';
import { ReactionFilterBar } from '@/components/gallery/ReactionFilterBar';
import { getDisplayImageUrl } from '@/lib/image-url';
import { GalleryAutoRefresh } from '@/components/gallery/GalleryAutoRefresh';
import { getArtworkMintStatusLabel } from '@/lib/domains/artworks';
import { GalleryReactionButtons } from '@/components/gallery/GalleryPageClient';

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
  const artworks = await getGalleryArtworks();

  return (
    <div className="page-stack">
      <GalleryAutoRefresh />
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Approved artworks that passed review and are now visible to the public gallery.</p>
      </section>

      <ReactionFilterBar />

      {artworks.length === 0 ? <section className="card surface-section"><p style={{ margin: 0 }}>No published artworks are available right now.</p></section> : (
        <section className="stack-md gallery-list">
          {artworks.map((artwork) => {
            const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
            return (
              <article key={artwork.id} className="card split-list-card gallery-list-card">
                <Image src={getDisplayImageUrl(artwork.imageUrl)} alt={artwork.title} width={720} height={520} unoptimized className="split-list-media" />
                <div className="gallery-list-content">
                  <div className="gallery-card-header">
                    <h3 style={{ margin: 0 }}>{artwork.title}</h3>
                    <span className="price">{Number(artwork.price).toFixed(2)} {artwork.currency}</span>
                  </div>
                  <div className="gallery-meta-grid">
                    <p style={{ margin: 0, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Artist:</strong> {artistName}</p>
                    <p style={{ margin: 0, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Category:</strong> {artwork.category?.name || 'General'}</p>
                    <p style={{ margin: 0, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Availability:</strong> {artwork.listingType === 'FIXED_PRICE' ? 'For sale' : artwork.listingType === 'AUCTION' ? 'Auction' : 'Not for sale'}</p>
                    <p style={{ margin: 0, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)' }}>Chain:</strong> {getArtworkMintStatusLabel(artwork.mintStatus || 'UNMINTED')}</p>
                  </div>
                  <p className="gallery-description">{artwork.description}</p>
                  <div className="card-actions"><Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link></div>
                </div>
                <div className="split-list-side"><GalleryReactionButtons artwork={artwork} /></div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
