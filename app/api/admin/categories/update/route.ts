import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const categoryId = Number(formData.get('categoryId') || 0);
  if (!categoryId) return NextResponse.redirect(new URL('/admin/categories', request.url));

  const currentCategory = await prisma.artworkCategory.findUnique({ where: { id: categoryId } });
  if (!currentCategory) return NextResponse.redirect(new URL('/admin/categories?error=not-found', request.url));

  const name = String(formData.get('name') || '').trim();
  const slug = normalizeSlug(String(formData.get('slug') || name));
  const description = String(formData.get('description') || '').trim() || null;
  const sortOrder = Number(formData.get('sortOrder') || 0);
  const isActive = String(formData.get('isActive') || 'true') === 'true';

  await prisma.artworkCategory.update({
    where: { id: categoryId },
    data: {
      name,
      slug,
      description,
      sortOrder,
      isActive
    }
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_CATEGORY_UPDATED',
    targetType: 'ARTWORK_CATEGORY',
    targetId: categoryId,
    oldValues: {
      name: currentCategory.name,
      slug: currentCategory.slug,
      description: currentCategory.description,
      sortOrder: currentCategory.sortOrder,
      isActive: currentCategory.isActive
    },
    newValues: { name, slug, description, sortOrder, isActive }
  });

  logger.info('Category updated', { userId: admin.user.userId, categoryId });
  return NextResponse.redirect(new URL('/admin/categories', request.url));
}