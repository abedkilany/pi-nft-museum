
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const isoCode = String(formData.get('isoCode') || '').trim().toUpperCase();
  const phoneCode = String(formData.get('phoneCode') || '').trim();
  const allowed = String(formData.get('allowed') || 'true') === 'true';

  if (!name || !isoCode || !phoneCode) {
    return NextResponse.redirect(new URL('/admin/countries', request.url));
  }

  await prisma.country.create({
    data: {
      name,
      isoCode,
      phoneCode,
      allowed,
      sortOrder: 9999
    }
  });

  logger.info('Admin created country', { adminUserId: admin.user.userId, isoCode, name });
  return NextResponse.redirect(new URL('/admin/countries', request.url));
}
