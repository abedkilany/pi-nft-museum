import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.categoriesManage);
  if ('error' in admin) return admin.error;
  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const slug = normalizeSlug(String(formData.get('slug') || name));
  if (!name || !slug) return NextResponse.redirect(new URL('/admin/categories', request.url));

  await prisma.artworkCategory.create({
    data: {
      name,
      slug,
      description: String(formData.get('description') || '').trim() || null,
      sortOrder: Number(formData.get('sortOrder') || 0),
      isActive: String(formData.get('isActive') || 'true') === 'true'
    }
  });
  logger.info('Category created', { userId: admin.user.userId, slug });
  return NextResponse.redirect(new URL('/admin/categories', request.url));
}