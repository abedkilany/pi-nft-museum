import { prisma } from '@/lib/domains/system';
import { canLazyMintNow, hasLazyMintSnapshot } from '@/lib/lazy-mint';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';

export async function performLazyMint({ artworkId, ownerUserId, ownerName, ownerWalletAddress = null }: {
  artworkId: number;
  ownerUserId: number;
  ownerName: string;
  ownerWalletAddress?: string | null;
}) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: {
      artist: {
        include: { artistProfile: true }
      }
    }
  });

  if (!artwork) {
    throw new Error('Artwork not found.');
  }

  if (artwork.artistUserId !== ownerUserId) {
    throw new Error('You are not allowed to lazy mint this artwork.');
  }

  if (!canLazyMintNow(artwork)) {
    throw new Error('Lazy mint is not open for this artwork.');
  }

  if (await hasLazyMintSnapshot(artworkId)) {
    throw new Error('This artwork was already lazy-minted.');
  }

  const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
  const mintedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const updatedArtwork = await tx.artwork.update({
      where: { id: artworkId },
      data: {
        status: ArtworkStatus.PUBLISHED,
        mintStatus: ArtworkMintStatus.MINTED,
        listingType: ArtworkListingType.NOT_FOR_SALE,
        visibility: ArtworkVisibility.PUBLIC,
        currentOwnerUserId: ownerUserId,
        mintedAt,
        publishedAt: artwork.publishedAt || mintedAt,
      }
    });

    const snapshot = await tx.artworkMintSnapshot.create({
      data: {
        artworkId: artwork.id,
        ownerUserId,
        ownerName,
        ownerWalletAddress,
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
        currentOwnerId: ownerUserId,
        currentOwnerName: ownerName,
        currentWalletAddress: ownerWalletAddress,
        acquiredAt: mintedAt,
      }
    });

    await tx.artworkOwnershipHistory.create({
      data: {
        artworkId: artwork.id,
        toOwnerId: ownerUserId,
        toOwnerName: ownerName,
        walletAddress: ownerWalletAddress,
        eventType: 'LAZY_MINT',
        createdAt: mintedAt,
      }
    });

    return { updatedArtwork, snapshot, ownership };
  });
}
