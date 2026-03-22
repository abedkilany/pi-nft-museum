import { AdminArtworksTable } from '@/components/admin/AdminArtworksTable';
import { prisma } from '@/lib/prisma';

import { requireAdminPage } from '@/lib/admin';
export default async function AdminArtworksPage() {
  await requireAdminPage();
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

  const mappedArtworks = artworks.map((artwork: any) => ({
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