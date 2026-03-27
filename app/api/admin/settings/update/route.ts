import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { SITE_SETTING_DEFINITIONS, ensureDefaultSiteSettings } from '@/lib/site-settings';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  await ensureDefaultSiteSettings();
  const formData = await request.formData();
  const previousSettings = await prisma.siteSetting.findMany({ select: { settingKey: true, settingValue: true } });

  for (const definition of SITE_SETTING_DEFINITIONS) {
    const value = String(formData.get(definition.key) ?? definition.defaultValue).trim();
    await prisma.siteSetting.upsert({
      where: { settingKey: definition.key },
      update: { settingValue: value, settingGroup: definition.group, isPublic: definition.isPublic ?? false },
      create: { settingKey: definition.key, settingValue: value, settingGroup: definition.group, isPublic: definition.isPublic ?? false }
    });
  }

  const updatedSettings = await prisma.siteSetting.findMany({ select: { settingKey: true, settingValue: true } });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_SETTINGS_UPDATED',
    targetType: 'SITE_SETTINGS',
    targetId: 'global',
    oldValues: previousSettings,
    newValues: updatedSettings
  });

  logger.info('Settings updated', { userId: admin.user.userId });
  return NextResponse.redirect(new URL('/admin/settings', request.url));
}