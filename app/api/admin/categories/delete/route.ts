import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const categoryId = Number(formData.get('categoryId') || 0);
  if (categoryId) {
    await prisma.artwork.updateMany({ where: { categoryId }, data: { categoryId: null } });
    await prisma.artworkCategory.delete({ where: { id: categoryId } });
    logger.info('Category deleted', { userId: admin.user.userId, categoryId });
  }
  return NextResponse.redirect(new URL('/admin/categories', request.url));
}
