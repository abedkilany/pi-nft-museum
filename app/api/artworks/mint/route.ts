import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { getCurrentUser } from '@/lib/domains/auth';
import { logger } from '@/lib/domains/system';
import { syncExpiredPublicReviewWindows } from '@/lib/artwork-windows';
import { assertSameOrigin } from '@/lib/services/request';
import { canLazyMintNow, hasLazyMintSnapshot } from '@/lib/lazy-mint';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    await syncExpiredPublicReviewWindows();
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

    const body = await request.json();
    const artworkId = Number(body.artworkId);
    if (!artworkId) return NextResponse.json({ error: 'Invalid artwork ID.' }, { status: 400 });

    const artwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: {
        artist: {
          include: { artistProfile: true }
        }
      }
    });
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 });
    if (artwork.artistUserId !== currentUser.userId) return NextResponse.json({ error: 'You are not allowed to mint this artwork.' }, { status: 403 });
    if (!canLazyMintNow(artwork)) return NextResponse.json({ error: 'Lazy mint is not open for this artwork.' }, { status: 400 });
    if (await hasLazyMintSnapshot(artworkId)) return NextResponse.json({ error: 'This artwork was already lazy-minted.' }, { status: 400 });

    const ownerName = currentUser.username;
    const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
    const mintedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updatedArtwork = await tx.artwork.update({
        where: { id: artworkId },
        data: {
          status: 'PUBLISHED',
          mintedAt,
          publishedAt: artwork.publishedAt || mintedAt,
        }
      });

      const snapshot = await tx.artworkMintSnapshot.create({
        data: {
          artworkId: artwork.id,
          ownerUserId: currentUser.userId,
          ownerName,
          ownerWalletAddress: null,
          title: artwork.title,
          description: artwork.description,
          imageUrl: artwork.imageUrl,
          artistId: artwork.artistUserId,
          artistName,
          finalRating: artwork.averageRating,
          totalVotes: artwork.ratingsCount,
          mintedAt,
        }
      });

      const ownership = await tx.artworkOwnership.create({
        data: {
          artworkId: artwork.id,
          currentOwnerId: currentUser.userId,
          currentOwnerName: ownerName,
          currentWalletAddress: null,
          acquiredAt: mintedAt,
        }
      });

      await tx.artworkOwnershipHistory.create({
        data: {
          artworkId: artwork.id,
          toOwnerId: currentUser.userId,
          toOwnerName: ownerName,
          walletAddress: null,
          eventType: 'LAZY_MINT',
          createdAt: mintedAt,
        }
      });

      return { updatedArtwork, snapshot, ownership };
    });

    logger.info('Artwork lazy minted and published', { artworkId: result.updatedArtwork.id, userId: currentUser.userId, snapshotId: result.snapshot.id, ownershipId: result.ownership.id });
    return NextResponse.json({ ok: true, artwork: result.updatedArtwork, snapshot: result.snapshot });
  } catch (error) {
    logger.error('Failed to lazy mint artwork', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
