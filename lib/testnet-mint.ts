import { prisma } from '@/lib/domains/system';
import { ArtworkMintStatus, ArtworkStatus } from '@/types/enums';

export const TESTNET_MINT_NETWORK = 'Pi Testnet';
export const TESTNET_MINT_CONTRACT_ADDRESS = 'pi-testnet-demo-contract';

export function canTestnetMintNow(artwork: { status: string; mintWindowOpensAt: Date | string | null; mintWindowEndsAt: Date | string | null; mintStatus?: string | null }) {
  if (artwork.status !== ArtworkStatus.PUBLIC_REVIEW) return false;
  if ((artwork.mintStatus || ArtworkMintStatus.UNMINTED) !== ArtworkMintStatus.UNMINTED) return false;
  if (!artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return false;
  const now = Date.now();
  const opensAt = new Date(artwork.mintWindowOpensAt).getTime();
  const endsAt = new Date(artwork.mintWindowEndsAt).getTime();
  return now >= opensAt && now <= endsAt;
}

export async function hasAnyMintSnapshot(artworkId: number) {
  const snapshot = await prisma.artworkMintSnapshot.findUnique({ where: { artworkId } });
  return Boolean(snapshot);
}
