import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const artworkId = Number(formData.get('artworkId'));
  if (artworkId) {
    await prisma.artwork.update({ where: { id: artworkId }, data: { status: 'PENDING', reviewedAt: null, reviewNote: null } });
  }
  return NextResponse.redirect(new URL('/admin/artworks', request.url));
}
