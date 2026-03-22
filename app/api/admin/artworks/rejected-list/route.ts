import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const artworks = await prisma.artwork.findMany({
    where: { status: 'REJECTED' },
    include: { artist: { include: { artistProfile: true } }, category: true },
    orderBy: { reviewedAt: 'desc' }
  });

  return NextResponse.json({ ok: true, data: artworks.map((artwork: any) => ({
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    price: Number(artwork.price),
    reviewNote: artwork.reviewNote,
    categoryName: artwork.category?.name || 'General',
    artistName: artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username,
  })) });
}
