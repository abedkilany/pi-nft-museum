import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const artworks = await prisma.artwork.findMany({
    where: { status: 'PENDING' },
    include: { artist: { include: { artistProfile: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const mappedArtworks = artworks.map((artwork: any) => ({
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    price: Number(artwork.price),
    status: artwork.status,
    createdAt: artwork.createdAt.toISOString(),
    artistName: artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username,
  }));

  return NextResponse.json({ ok: true, data: mappedArtworks });
}
