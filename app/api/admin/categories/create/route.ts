import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';

const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const slug = normalizeSlug(String(formData.get('slug') || name));
  if (!name || !slug) return NextResponse.redirect(new URL('/admin/categories', request.url));

  const description = String(formData.get('description') || '').trim() || null;
  const sortOrder = Number(formData.get('sortOrder') || 0);
  const isActive = String(formData.get('isActive') || 'true') === 'true';

  const category = await prisma.artworkCategory.create({
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
    action: 'ADMIN_CATEGORY_CREATED',
    targetType: 'ARTWORK_CATEGORY',
    targetId: category.id,
    newValues: { name, slug, description, sortOrder, isActive }
  });

  logger.info('Category created', { userId: admin.user.userId, slug });
  return NextResponse.redirect(new URL('/admin/categories', request.url));
}