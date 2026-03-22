import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.artworksReview);
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const artworkId = Number(formData.get('artworkId'));
  if (artworkId) {
    await prisma.artwork.update({ where: { id: artworkId }, data: { status: 'PENDING', reviewedAt: null, reviewNote: null } });
  }
  return NextResponse.redirect(new URL('/admin/artworks', request.url));
}