import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { ensureDefaultSiteSettings } from '@/lib/site-settings';
import { validateSiteSettingsForm } from '@/lib/admin-settings-validator';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.settingsUpdate);
  if ('error' in admin) return admin.error;

  await ensureDefaultSiteSettings();
  const formData = await request.formData();
  const validation = validateSiteSettingsForm(formData);

  if (!validation.ok) {
    const url = new URL('/admin/settings', request.url);
    url.searchParams.set('error', `${validation.field ? `${validation.field}: ` : ''}${validation.message}`);
    return NextResponse.redirect(url);
  }

  const oldSettings = await prisma.siteSetting.findMany({
    where: { settingKey: { in: validation.values.map((entry) => entry.key) } },
    select: { settingKey: true, settingValue: true },
  });

  const oldMap = Object.fromEntries(oldSettings.map((entry) => [entry.settingKey, entry.settingValue]));
  const newMap = Object.fromEntries(validation.values.map((entry) => [entry.key, entry.value]));

  await prisma.$transaction(
    validation.values.map((definition) =>
      prisma.siteSetting.upsert({
        where: { settingKey: definition.key },
        update: {
          settingValue: definition.value,
          settingGroup: definition.group,
        },
        create: {
          settingKey: definition.key,
          settingValue: definition.value,
          settingGroup: definition.group,
        },
      })
    )
  );

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_SETTINGS_UPDATED',
    targetType: 'SITE_SETTINGS',
    targetId: 'global',
    oldValues: oldMap,
    newValues: newMap,
  });

  logger.info('Settings updated', { userId: admin.user.userId, changedKeys: validation.values.map((entry) => entry.key) });

  const url = new URL('/admin/settings', request.url);
  url.searchParams.set('message', 'Settings saved successfully.');
  return NextResponse.redirect(url);
}
