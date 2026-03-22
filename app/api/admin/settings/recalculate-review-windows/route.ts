import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPublicReviewDates } from '@/lib/artwork-windows';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const currentUser = await requireAdminApi(PERMISSIONS.settingsUpdate);
  if ('error' in currentUser) return currentUser.error;

  const artworks = await prisma.artwork.findMany({
    where: {
      status: 'PUBLIC_REVIEW'
    },
    select: {
      id: true,
      publicReviewStartedAt: true
    }
  });

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
  }

  return NextResponse.redirect(new URL('/admin/settings', request.url));
}