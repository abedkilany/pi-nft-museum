import { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { prisma } from '@/lib/domains/system';
import { ArtworkListingType, ArtworkMintStatus, ArtworkStatus, ArtworkVisibility } from '@/types/enums';
import { canTestnetMintNow, hasAnyMintSnapshot, TESTNET_MINT_CONTRACT_ADDRESS, TESTNET_MINT_NETWORK } from '@/lib/testnet-mint';

function buildMintReference(artworkId: number) {
  return `pi-testnet-mint-${artworkId}-${Date.now()}`;
}

function buildTokenId(artworkId: number) {
  return `${artworkId}-${Date.now()}`;
}

function buildTxHash(artworkId: number) {
  return `0x${crypto.createHash('sha256').update(`${artworkId}:${Date.now()}:${Math.random()}`).digest('hex')}`;
}

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
  const mintedAt = new Date();
  const tokenId = buildTokenId(artwork.id);
  const txHash = paymentTxid || buildTxHash(artwork.id);
  const mintReference = paymentIdentifier || buildMintReference(artwork.id);
  const metadataSnapshot = {
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
    network: TESTNET_MINT_NETWORK,
    contractAddress: TESTNET_MINT_CONTRACT_ADDRESS,
  };

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingExecution = paymentIdentifier
      ? await tx.artworkMintExecution.findUnique({ where: { paymentIdentifier } })
      : null;

    const execution = existingExecution
      ? await tx.artworkMintExecution.update({
          where: { id: existingExecution.id },
          data: {
            status: 'CONFIRMED',
            network: TESTNET_MINT_NETWORK,
            contractAddress: TESTNET_MINT_CONTRACT_ADDRESS,
            tokenId,
            txHash,
            mintReference,
            metadataSnapshot,
            confirmedAt: mintedAt,
            submittedAt: existingExecution.submittedAt || mintedAt,
            errorMessage: null,
          }
        })
      : await tx.artworkMintExecution.create({
          data: {
            artworkId: artwork.id,
            initiatedByUserId: ownerUserId,
            paymentIdentifier,
            executionType: 'TESTNET',
            status: 'CONFIRMED',
            network: TESTNET_MINT_NETWORK,
            contractAddress: TESTNET_MINT_CONTRACT_ADDRESS,
            tokenId,
            txHash,
            mintReference,
            metadataSnapshot,
            submittedAt: mintedAt,
            confirmedAt: mintedAt,
          }
        });

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
        network: TESTNET_MINT_NETWORK,
        contractAddress: TESTNET_MINT_CONTRACT_ADDRESS,
        tokenId,
        txHash,
        mintReference,
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

    return { updatedArtwork, snapshot, ownership, execution };
  });
}
