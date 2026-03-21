import { prisma } from '@/lib/prisma';
import { getNumberSetting, getSiteSettingsMap, getStringSetting } from '@/lib/site-settings';

export async function purgeExpiredArchivedArtworks() {
  const settings = await getSiteSettingsMap();
  const retentionDays = Math.max(0, getNumberSetting(settings, 'artwork_archive_retention_days', 30));
  if (retentionDays <= 0) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const expired = await prisma.artwork.findMany({
    where: { status: 'ARCHIVED', archivedAt: { not: null, lte: cutoff } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;
  await prisma.artwork.deleteMany({ where: { id: { in: expired.map((item: any) => item.id) } } });
  return expired.length;
}

export async function getArchiveMessage() {
  const settings = await getSiteSettingsMap();
  const days = Math.max(0, getNumberSetting(settings, 'artwork_archive_retention_days', 30));
  return getStringSetting(settings, 'artwork_archive_message_artist', 'Your artwork has been archived. It will be permanently deleted after {days} days unless you restore it or delete it permanently yourself.').replaceAll('{days}', String(days));
}
