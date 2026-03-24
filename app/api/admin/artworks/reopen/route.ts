import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const artworkId = Number(formData.get('artworkId'));
  if (artworkId) {
    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    await prisma.artwork.update({ where: { id: artworkId }, data: { status: 'PENDING', reviewedAt: null, reviewNote: null } });

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_ARTWORK_REOPENED',
      targetType: 'ARTWORK',
      targetId: artworkId,
      oldValues: artwork ? { status: artwork.status, reviewedAt: artwork.reviewedAt, reviewNote: artwork.reviewNote } : undefined,
      newValues: { status: 'PENDING', reviewedAt: null, reviewNote: null }
    });
  }
  return NextResponse.redirect(new URL('/admin/artworks', request.url));
}