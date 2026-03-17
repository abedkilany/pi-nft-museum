import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { buildPublicReviewDates } from '@/lib/artwork-windows';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !['superadmin', 'admin'].includes(currentUser.role)) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

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
