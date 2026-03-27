import { ArtworkStatus } from '@/types/enums';
import type { ArtworkStatus as PrismaArtworkStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { getEnumField, getNumberField, readJsonObject } from '@/lib/services/request';

const OWNER_TARGET_STATUSES = [ArtworkStatus.DRAFT, ArtworkStatus.PENDING, 'RESTORE_ARCHIVED'] as const;

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ ok: false, error: 'You must be logged in.' }, { status: 401 });

    const bodyResult = await readJsonObject(request);
    if (!bodyResult.ok) return bodyResult.response;

    const artworkIdResult = getNumberField(bodyResult.data, 'artworkId', { required: true, integer: true, min: 1 });
    if (!artworkIdResult.ok) return artworkIdResult.response;
    const statusResult = getEnumField(bodyResult.data, 'targetStatus', OWNER_TARGET_STATUSES, { required: true, normalize: 'upper' });
    if (!statusResult.ok) return statusResult.response;

    const id = artworkIdResult.data;
    const status = statusResult.data;

    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId !== currentUser.userId) return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 403 });

    if (status === 'RESTORE_ARCHIVED') {
      if (artwork.status !== ArtworkStatus.ARCHIVED) {
        return NextResponse.json({ ok: false, error: 'Only archived artworks can be restored.' }, { status: 400 });
      }

      const restoredStatus: PrismaArtworkStatus = artwork.statusBeforeArchive && artwork.statusBeforeArchive !== ArtworkStatus.ARCHIVED
        ? (artwork.statusBeforeArchive as PrismaArtworkStatus)
        : ArtworkStatus.DRAFT;

      await prisma.artwork.update({ where: { id }, data: { status: restoredStatus, archivedAt: null, statusBeforeArchive: null } });
      logger.info('Artwork restored from archive', { artworkId: id, userId: currentUser.userId, restoredStatus });
      return NextResponse.json({ ok: true, message: 'Artwork restored.' });
    }

    if (![ArtworkStatus.DRAFT, ArtworkStatus.PENDING].includes(artwork.status as ArtworkStatus)) {
      return NextResponse.json({ ok: false, error: 'Artwork status can no longer be changed by the artist.' }, { status: 400 });
    }

    if (artwork.status === status) {
      return NextResponse.json({ ok: true, message: 'No change needed.' });
    }

    await prisma.artwork.update({ where: { id }, data: { status: status as PrismaArtworkStatus } });
    logger.info('Artwork owner status changed', { artworkId: id, userId: currentUser.userId, from: artwork.status, to: status });
    return NextResponse.json({ ok: true, message: status === ArtworkStatus.PENDING ? 'Artwork submitted for review.' : 'Artwork moved back to draft.' });
  } catch (error) {
    logger.error('Failed to change owner artwork status', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
