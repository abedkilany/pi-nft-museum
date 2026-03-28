import { prisma } from '@/lib/domains/system';
import { ArtworkStatus } from '@/types/enums';

export function canLazyMintNow(artwork: { status: string; mintWindowOpensAt: Date | string | null; mintWindowEndsAt: Date | string | null }) {
  if (artwork.status !== ArtworkStatus.PUBLIC_REVIEW) return false;
  if (!artwork.mintWindowOpensAt || !artwork.mintWindowEndsAt) return false;
  const now = Date.now();
  const opensAt = new Date(artwork.mintWindowOpensAt).getTime();
  const endsAt = new Date(artwork.mintWindowEndsAt).getTime();
  return now >= opensAt && now <= endsAt;
}

export async function hasLazyMintSnapshot(artworkId: number) {
  const snapshot = await prisma.artworkMintSnapshot.findUnique({ where: { artworkId } });
  return Boolean(snapshot);
}
