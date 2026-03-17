import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { canMintNow, syncExpiredPublicReviewWindows } from '@/lib/artwork-windows';

export async function POST(request: Request) {
  try {
    await syncExpiredPublicReviewWindows();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

    const body = await request.json();
    const artworkId = Number(body.artworkId);
    if (!artworkId) return NextResponse.json({ error: 'Invalid artwork ID.' }, { status: 400 });

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId !== currentUser.userId) return NextResponse.json({ error: 'You are not allowed to mint this artwork.' }, { status: 403 });
    if (!canMintNow(artwork)) return NextResponse.json({ error: 'Mint window is not open for this artwork.' }, { status: 400 });

    await prisma.artwork.update({ where: { id: artworkId }, data: { status: 'MINTING' } });
    const updatedArtwork = await prisma.artwork.update({ where: { id: artworkId }, data: { status: 'PUBLISHED', mintedAt: new Date(), publishedAt: new Date() } });

    logger.info('Artwork minted and published', { artworkId: updatedArtwork.id, userId: currentUser.userId });
    return NextResponse.json({ ok: true, artwork: updatedArtwork });
  } catch (error) {
    logger.error('Failed to mint artwork', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
