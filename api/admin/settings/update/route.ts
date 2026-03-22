import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { SITE_SETTING_DEFINITIONS, ensureDefaultSiteSettings } from '@/lib/site-settings';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  await ensureDefaultSiteSettings();
  const formData = await request.formData();

  for (const definition of SITE_SETTING_DEFINITIONS) {
    const value = String(formData.get(definition.key) ?? definition.defaultValue).trim();
    await prisma.siteSetting.upsert({
      where: { settingKey: definition.key },
      update: { settingValue: value, settingGroup: definition.group, isPublic: definition.isPublic ?? false },
      create: { settingKey: definition.key, settingValue: value, settingGroup: definition.group, isPublic: definition.isPublic ?? false }
    });
  }

  logger.info('Settings updated', { userId: admin.user.userId });
  return NextResponse.redirect(new URL('/admin/settings', request.url));
}