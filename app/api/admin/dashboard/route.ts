import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const [usersCount, artworksCount, pendingArtworksCount, publishedCount, pagesCount, categoriesCount, countriesCount, commentsCount, reportsCount] = await Promise.all([
    prisma.user.count(),
    prisma.artwork.count(),
    prisma.artwork.count({ where: { status: 'PENDING' } }),
    prisma.artwork.count({ where: { status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.page.count(),
    prisma.artworkCategory.count(),
    prisma.country.count(),
    prisma.artworkComment.count(),
    prisma.artworkReport.count(),
  ]);

  return NextResponse.json({
    ok: true,
    data: { usersCount, artworksCount, pendingArtworksCount, publishedCount, pagesCount, categoriesCount, countriesCount, commentsCount, reportsCount }
  });
}
