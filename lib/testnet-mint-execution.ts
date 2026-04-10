import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';
import { canTestnetMintNow, hasAnyMintSnapshot } from '@/lib/testnet-mint';
import { runPiTestnetPrototypeMint } from '@/lib/pi-testnet-prototype-mint';

export async function performTestnetMint({ artworkId, ownerUserId, ownerName, ownerWalletAddress = null, paymentIdentifier = null, paymentTxid = null }: {
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
      artist: { include: { artistProfile: true } },
      mintExecutions: {
        where: { executionType: 'TESTNET' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      }
    }
  });

  if (!artwork) throw new Error('Artwork not found.');
  if (artwork.artistUserId !== ownerUserId) throw new Error('You are not allowed to mint this artwork on testnet.');
  if (!canTestnetMintNow(artwork)) throw new Error('Testnet mint is not open for this artwork.');
  if (await hasAnyMintSnapshot(artworkId)) throw new Error('This artwork was already finalized.');

  const artistName = artwork.artist.artistProfile?.displayName || artwork.artist.fullName || artwork.artist.username;
  const metadataSnapshot: Prisma.InputJsonValue = {
    artworkId: artwork.id,
    title: artwork.title,
    description: artwork.description,
    imageUrl: artwork.imageUrl,
    artistId: artwork.artistUserId,
    artistName,
    finalRating: Number(artwork.averageRating || 0),
    totalVotes: artwork.ratingsCount || 0,
    ownerUserId,
    ownerName,
  };

  const existingExecution = paymentIdentifier
    ? await prisma.artworkMintExecution.findUnique({ where: { paymentIdentifier } })
    : null;

  const execution = existingExecution
    ? await prisma.artworkMintExecution.update({
        where: { id: existingExecution.id },
        data: {
          executionType: 'TESTNET',
          status: 'SUBMITTED',
          metadataSnapshot,
          errorMessage: null,
          submittedAt: existingExecution.submittedAt || new Date(),
        }
      })
    : await prisma.artworkMintExecution.create({
        data: {
          artworkId: artwork.id,
          initiatedByUserId: ownerUserId,
          paymentIdentifier,
          executionType: 'TESTNET',
          status: 'SUBMITTED',
          metadataSnapshot,
          submittedAt: new Date(),
        }
      });

  try {
    const result = await runPiTestnetPrototypeMint({
      artworkId: artwork.id,
      ownerUserId,
      ownerName,
      ownerWalletAddress,
      paymentIdentifier,
      paymentTxid,
      metadataSnapshot,
    });

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedExecution = await tx.artworkMintExecution.update({
        where: { id: execution.id },
        data: {
          status: 'CONFIRMED',
          network: result.network,
          contractAddress: result.contractAddress,
          tokenId: result.tokenId,
          txHash: result.txHash,
          mintReference: result.mintReference,
          metadataSnapshot: { ...metadataSnapshot, provider: result.provider },
          confirmedAt: result.confirmedAt,
          submittedAt: result.submittedAt,
          errorMessage: null,
        }
      });

      const mintedAt = result.confirmedAt;
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
          mintType: 'TESTNET',
          mintedAt,
          title: artwork.title,
          description: artwork.description,
          imageUrl: artwork.imageUrl,
          artistId: artwork.artistUserId,
          artistName,
          finalRating: artwork.averageRating,
          totalVotes: artwork.ratingsCount,
          metadataVersion: 1,
          network: result.network,
          contractAddress: result.contractAddress,
          tokenId: result.tokenId,
          txHash: result.txHash,
          mintReference: result.mintReference,
          onChainMintedAt: mintedAt,
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
          eventType: 'TESTNET_MINT',
          createdAt: mintedAt,
        }
      });

      return { updatedArtwork, snapshot, ownership, execution: updatedExecution, provider: result.provider };
    });
  } catch (error) {
    await prisma.artworkMintExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown prototype mint failure',
      }
    });
    throw error;
  }
}
