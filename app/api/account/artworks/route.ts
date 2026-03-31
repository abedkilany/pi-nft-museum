import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/domains/auth';
import { prisma } from '@/lib/domains/system';
import { getSiteSettingsMap, getNumberSetting } from '@/lib/site-settings';
import { getArchiveMessage, purgeExpiredArchivedArtworks } from '@/lib/artwork-archive';
import { syncExpiredPublicReviewWindows } from '@/lib/artwork-windows';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  await syncExpiredPublicReviewWindows();
  await purgeExpiredArchivedArtworks();

  const settings = await getSiteSettingsMap();
  const reviewHours = getNumberSetting(settings, 'public_review_hours', 48);
  const archiveMessage = await getArchiveMessage();

  const artworks = await prisma.artwork.findMany({
    where: {
      OR: [
        { artistUserId: currentUser.userId },
        { currentOwnerUserId: currentUser.userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      artist: {
        select: {
          id: true,
          username: true,
          fullName: true,
          artistProfile: { select: { displayName: true } },
        },
      },
      currentOwner: {
        select: {
          id: true,
          username: true,
          fullName: true,
          artistProfile: { select: { displayName: true } },
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    artworks,
    reviewHours,
    archiveMessage,
    user: { userId: currentUser.userId, username: currentUser.username },
  });
}
