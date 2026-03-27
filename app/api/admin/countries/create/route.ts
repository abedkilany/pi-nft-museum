
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
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

  const country = await prisma.country.create({
    data: {
      name,
      isoCode,
      phoneCode,
      allowed,
      sortOrder: 9999
    }
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_COUNTRY_CREATED',
    targetType: 'COUNTRY',
    targetId: country.id,
    newValues: { name, isoCode, phoneCode, allowed }
  });

  logger.info('Admin created country', { adminUserId: admin.user.userId, isoCode, name });
  return NextResponse.redirect(new URL('/admin/countries', request.url));
}