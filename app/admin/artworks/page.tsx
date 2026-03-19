import { AdminArtworksTable } from '@/components/admin/AdminArtworksTable';
import { prisma } from '@/lib/prisma';

export default async function AdminArtworksPage() {
  const artworks = await prisma.artwork.findMany({
    where: {
      status: 'PENDING'
    },
    include: {
      artist: {
        include: {
          artistProfile: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const mappedArtworks = artworks.map((artwork) => ({
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    price: Number(artwork.price),
    status: artwork.status,
    createdAt: artwork.createdAt.toISOString(),
    artistName:
      artwork.artist.artistProfile?.displayName ||
      artwork.artist.fullName ||
      artwork.artist.username
  }));

  return <AdminArtworksTable artworks={mappedArtworks} />;
}
