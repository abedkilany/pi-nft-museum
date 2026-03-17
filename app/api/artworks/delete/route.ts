
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { getArchiveMessage } from '@/lib/artwork-archive';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { artworkId, permanent } = await request.json();
    const artwork = await prisma.artwork.findUnique({ where: { id: Number(artworkId) } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId !== currentUser.userId) return NextResponse.json({ error: 'You cannot delete this artwork.' }, { status: 403 });

    if (Boolean(permanent)) {
      await prisma.artwork.delete({ where: { id: artwork.id } });
      logger.warn('Artwork permanently deleted by owner', { userId: currentUser.userId, artworkId: artwork.id });
      return NextResponse.json({ ok: true, message: 'Artwork permanently deleted.' });
    }

    await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        statusBeforeArchive: artwork.status,
        archivedAt: new Date(),
        status: 'ARCHIVED',
      },
    });

    logger.warn('Artwork archived by owner', { userId: currentUser.userId, artworkId: artwork.id });
    return NextResponse.json({ ok: true, message: await getArchiveMessage() });
  } catch (error) {
    logger.error('Artwork archive/deletion failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
