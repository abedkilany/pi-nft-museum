import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';
import { canLazyMintNow, hasLazyMintSnapshot } from '@/lib/lazy-mint';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';

export async function performLazyMint({ artworkId, ownerUserId, ownerName, ownerWalletAddress = null, paymentIdentifier = null, paymentTxid = null }: {
  artworkId: number;
  ownerUserId: number;
  ownerName: string;
  ownerWalletAddress?: string | null;
  paymentIdentifier?: string | null;
  paymentTxid?: string | null;
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

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updatedArtwork = await tx.artwork.update({
      where: { id: artworkId },
      data: {
        status: ArtworkStatus.PUBLISHED,
        mintStatus: ArtworkMintStatus.LAZY_MINTED,
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
        network: 'Off-chain',
        txHash: paymentTxid,
        mintReference: paymentIdentifier,
      }
    });

    await tx.artworkMintExecution.upsert({
      where: paymentIdentifier ? { paymentIdentifier } : { paymentIdentifier: `lazy-${artwork.id}-${mintedAt.getTime()}` },
      update: {
        status: 'CONFIRMED',
        network: 'Off-chain',
        txHash: paymentTxid,
        mintReference: paymentIdentifier,
        confirmedAt: mintedAt,
        submittedAt: mintedAt,
        metadataSnapshot: { artworkId: artwork.id, title: artwork.title, finalRating: Number(artwork.averageRating || 0), totalVotes: artwork.ratingsCount || 0, mintType: 'LAZY' },
        errorMessage: null,
      },
      create: {
        artworkId: artwork.id,
        initiatedByUserId: ownerUserId,
        paymentIdentifier: paymentIdentifier || `lazy-${artwork.id}-${mintedAt.getTime()}`,
        executionType: 'LAZY',
        status: 'CONFIRMED',
        network: 'Off-chain',
        txHash: paymentTxid,
        mintReference: paymentIdentifier,
        submittedAt: mintedAt,
        confirmedAt: mintedAt,
        metadataSnapshot: { artworkId: artwork.id, title: artwork.title, finalRating: Number(artwork.averageRating || 0), totalVotes: artwork.ratingsCount || 0, mintType: 'LAZY' },
      }
    });

    const ownership = await tx.artworkOwnership.upsert({
      where: { artworkId: artwork.id },
      update: {
        currentOwnerId: ownerUserId,
        currentOwnerName: ownerName,
        currentWalletAddress: ownerWalletAddress,
        acquiredAt: mintedAt,
      },
      create: {
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
