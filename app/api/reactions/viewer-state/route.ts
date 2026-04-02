import { NextRequest, NextResponse } from 'next/server';
import { prisma, logger } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const artworkId = Number(request.nextUrl.searchParams.get('artworkId'));
    if (!artworkId) {
      return NextResponse.json({ ok: false, error: 'Artwork id is required.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ ok: false, authenticated: false, currentReaction: null }, { status: 401 });
    }

    const [reaction, artwork] = await Promise.all([
      prisma.artworkReaction.findUnique({
        where: {
          artworkId_userId: {
            artworkId,
            userId: currentUser.userId,
          },
        },
        select: { type: true },
      }),
      prisma.artwork.findUnique({
        where: { id: artworkId },
        select: { likesCount: true, dislikesCount: true },
      }),
    ]);

    if (!artwork) {
      return NextResponse.json({ ok: false, error: 'Artwork not found.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      currentReaction: reaction?.type ?? null,
      likesCount: Number(artwork.likesCount ?? 0),
      dislikesCount: Number(artwork.dislikesCount ?? 0),
    });
  } catch (error) {
    logger.error('Failed to load artwork reaction viewer state', error);
    return NextResponse.json({ ok: false, error: 'Failed to load reaction state.' }, { status: 500 });
  }
}
