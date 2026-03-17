import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'You must be logged in.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const artworkId = Number(body.artworkId);

    if (!artworkId) {
      return NextResponse.json(
        { error: 'Invalid artwork ID.' },
        { status: 400 }
      );
    }

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId }
    });

    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found.' },
        { status: 404 }
      );
    }

    if (artwork.artistUserId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'You are not allowed to update this artwork.' },
        { status: 403 }
      );
    }

    if (artwork.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected artworks can be resubmitted.' },
        { status: 400 }
      );
    }

    const updatedArtwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        status: 'PENDING',
        reviewNote: null,
        reviewedAt: null
      }
    });

    logger.info('Artwork resubmitted for review', {
      artworkId: updatedArtwork.id,
      userId: currentUser.userId
    });

    return NextResponse.json({
      ok: true,
      artwork: updatedArtwork
    });
  } catch (error) {
    logger.error('Failed to resubmit artwork', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown server error'
      },
      { status: 500 }
    );
  }
}