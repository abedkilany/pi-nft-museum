
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.countriesManage);
  if ('error' in admin) return admin.error;

  const formData = await request.formData();
  const countryId = Number(formData.get('countryId'));
  const name = String(formData.get('name') || '').trim();
  const isoCode = String(formData.get('isoCode') || '').trim().toUpperCase();
  const phoneCode = String(formData.get('phoneCode') || '').trim();
  const allowed = String(formData.get('allowed') || 'true') === 'true';

  if (!countryId || !name || !isoCode || !phoneCode) {
    return NextResponse.redirect(new URL('/admin/countries', request.url));
  }

  await prisma.country.update({
    where: { id: countryId },
    data: { name, isoCode, phoneCode, allowed }
  });

  logger.info('Admin updated country', { adminUserId: admin.user.userId, countryId, isoCode, name });
  return NextResponse.redirect(new URL('/admin/countries', request.url));
}