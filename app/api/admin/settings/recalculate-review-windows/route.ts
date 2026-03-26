import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildPublicReviewDates } from '@/lib/artwork-windows.server';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.settingsUpdate);
  if ('error' in admin) return admin.error;

  const artworks = await prisma.artwork.findMany({
    where: {
      status: 'PUBLIC_REVIEW'
    },
    select: {
      id: true,
      publicReviewStartedAt: true
    }
  });

  let updatedCount = 0;

  for (const artwork of artworks) {
    const dates = await buildPublicReviewDates(artwork.publicReviewStartedAt || new Date());

    await prisma.artwork.update({
      where: { id: artwork.id },
      data: {
        publicReviewStartedAt: dates.publicReviewStartedAt,
        mintWindowOpensAt: dates.mintWindowOpensAt,
        mintWindowEndsAt: dates.mintWindowEndsAt
      }
    });

    updatedCount += 1;
  }

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_RECALCULATED_REVIEW_WINDOWS',
    targetType: 'ARTWORK_REVIEW_WINDOWS',
    targetId: 'bulk',
    newValues: { updatedCount }
  });

  return NextResponse.redirect(new URL('/admin/settings', request.url));
}
