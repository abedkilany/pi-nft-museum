import { ArtworkStatus } from '@/types/enums';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { getNumberField, readJsonObject } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ ok: false, error: 'You must be logged in.' }, { status: 401 });
    }

    const bodyResult = await readJsonObject(request);
    if (!bodyResult.ok) return bodyResult.response;

    const artworkIdResult = getNumberField(bodyResult.data, 'artworkId', { required: true, integer: true, min: 1 });
    if (!artworkIdResult.ok) return artworkIdResult.response;
    const artworkId = artworkIdResult.data;

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });

    if (!artwork) {
      return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
    }

    if (artwork.artistUserId !== currentUser.userId) {
      return NextResponse.json({ ok: false, error: 'You are not allowed to update this artwork.' }, { status: 403 });
    }

    if (artwork.status !== ArtworkStatus.REJECTED) {
      return NextResponse.json({ ok: false, error: 'Only rejected artworks can be resubmitted.' }, { status: 400 });
    }

    const updatedArtwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        status: ArtworkStatus.PENDING_REVIEW,
        reviewNote: null,
        reviewedAt: null,
      },
    });

    logger.info('Artwork resubmitted for review', {
      artworkId: updatedArtwork.id,
      userId: currentUser.userId,
    });

    return NextResponse.json({ ok: true, artwork: updatedArtwork });
  } catch (error) {
    logger.error('Failed to resubmit artwork', error);

    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}