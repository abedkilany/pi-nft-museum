import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const categoryId = Number(formData.get('categoryId') || 0);
  if (categoryId) {
    const category = await prisma.artworkCategory.findUnique({ where: { id: categoryId } });
    await prisma.artwork.updateMany({ where: { categoryId }, data: { categoryId: null } });
    await prisma.artworkCategory.delete({ where: { id: categoryId } });

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_CATEGORY_DELETED',
      targetType: 'ARTWORK_CATEGORY',
      targetId: categoryId,
      oldValues: category ? { name: category.name, slug: category.slug } : undefined,
      newValues: { detachedArtworks: true }
    });

    logger.info('Category deleted', { userId: admin.user.userId, categoryId });
  }
  return NextResponse.redirect(new URL('/admin/categories', request.url));
}