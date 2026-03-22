import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserAccess } from '@/lib/permissions';
import { buildAdminSections } from '@/lib/admin-sections';

export async function GET() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!access.isStaff) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  }

  const [
    usersCount,
    artworksCount,
    pendingArtworksCount,
    publishedCount,
    pagesCount,
    categoriesCount,
    countriesCount,
    commentsCount,
    reportsCount,
    staffCount,
    auditCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.artwork.count(),
    prisma.artwork.count({ where: { status: 'PENDING' } }),
    prisma.artwork.count({ where: { status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.page.count(),
    prisma.artworkCategory.count(),
    prisma.country.count(),
    prisma.artworkComment.count(),
    prisma.artworkReport.count(),
    prisma.user.count({ where: { role: { key: { in: ['moderator', 'admin', 'superadmin'] } } } }),
    prisma.auditLog.count(),
  ]);

  return NextResponse.json({
    ok: true,
    user: {
      id: access.sessionUser.userId,
      username: access.sessionUser.username,
      role: access.role,
    },
    access: {
      isSuperadmin: access.isSuperadmin,
      permissions: access.permissions,
      sections: buildAdminSections(access.permissions),
    },
    stats: {
      usersCount,
      artworksCount,
      pendingArtworksCount,
      publishedCount,
      pagesCount,
      categoriesCount,
      countriesCount,
      commentsCount,
      reportsCount,
      staffCount,
      auditCount,
    },
  });
}
