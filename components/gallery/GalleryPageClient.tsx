'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AuthAwareReactionButtons } from '@/components/auth/AuthAwareReactionButtons';
import { getDisplayImageUrl } from '@/lib/image-url';
import { getArtworkMintStatusLabel } from '@/lib/domains/artworks';

type GalleryArtwork = {
  id: number;
  title: string;
  imageUrl: string;
  price: number | string;
  currency: string;
  description: string | null;
  listingType: string;
  mintStatus: string | null;
  likesCount: number;
  dislikesCount: number;
  artist: {
    username: string;
    fullName: string | null;
    artistProfile: { displayName: string | null } | null;
  };
  category: { name: string } | null;
};

export function GalleryPageClient({ artworks }: { artworks: GalleryArtwork[] }) {
  return (
    <div className="page-stack">
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
                <div className="split-list-side">
                  <AuthAwareReactionButtons artworkId={artwork.id} likesCount={artwork.likesCount} dislikesCount={artwork.dislikesCount} myReaction={null} />
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
