import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

    const { artworkId, targetStatus } = await request.json();
    const id = Number(artworkId);
    const status = String(targetStatus || '').toUpperCase();
    if (!id || !['DRAFT', 'PENDING', 'RESTORE_ARCHIVED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId !== currentUser.userId) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
    if (status === 'RESTORE_ARCHIVED') {
      if (artwork.status !== 'ARCHIVED') return NextResponse.json({ error: 'Only archived artworks can be restored.' }, { status: 400 });
      const restoredStatus = artwork.statusBeforeArchive && artwork.statusBeforeArchive !== 'ARCHIVED' ? artwork.statusBeforeArchive : 'DRAFT';
      await prisma.artwork.update({ where: { id }, data: { status: restoredStatus as any, archivedAt: null, statusBeforeArchive: null } });
      logger.info('Artwork restored from archive', { artworkId: id, userId: currentUser.userId, restoredStatus });
      return NextResponse.json({ ok: true, message: 'Artwork restored.' });
    }

    if (!['DRAFT', 'PENDING'].includes(artwork.status)) {
      return NextResponse.json({ error: 'Artwork status can no longer be changed by the artist.' }, { status: 400 });
    }

    if (artwork.status === status) {
      return NextResponse.json({ ok: true, message: 'No change needed.' });
    }

    await prisma.artwork.update({ where: { id }, data: { status: status as any } });
    logger.info('Artwork owner status changed', { artworkId: id, userId: currentUser.userId, from: artwork.status, to: status });
    return NextResponse.json({ ok: true, message: status === 'PENDING' ? 'Artwork submitted for review.' : 'Artwork moved back to draft.' });
  } catch (error) {
    logger.error('Failed to change owner artwork status', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}