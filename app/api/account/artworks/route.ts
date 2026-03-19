import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
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
    where: { artistUserId: currentUser.userId },
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });

  return NextResponse.json({ ok: true, artworks, reviewHours, archiveMessage });
}
