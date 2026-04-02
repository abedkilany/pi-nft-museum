import { prisma } from '@/lib/domains/system';
import { ReactionFilterBar } from '@/components/gallery/ReactionFilterBar';
import { GalleryAutoRefresh } from '@/components/gallery/GalleryAutoRefresh';
import { GalleryPageClient } from '@/components/gallery/GalleryPageClient';

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
  const artworksRaw = await getGalleryArtworks();
  const artworks = artworksRaw.map((artwork) => ({
    ...artwork,
    price: Number(artwork.price),
  }));

  return (
    <div className="page-stack">
      <GalleryAutoRefresh />
      <section className="card surface-section">
        <h1 style={{ margin: '0 0 8px' }}>Gallery</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Approved artworks that passed review and are now visible to the public gallery.</p>
      </section>

      <ReactionFilterBar />
      <GalleryPageClient artworks={artworks} />
    </div>
  );
}
