import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { normalizeMenuItems } from '@/lib/services/content';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { readJsonObject, validationError } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const parsedBody = await readJsonObject(request);
  if (!parsedBody.ok) return parsedBody.response;

  const rawItems = parsedBody.data.items;
  if (rawItems != null && !Array.isArray(rawItems)) {
    return validationError('"items" must be an array.', { items: 'Must be an array' });
  }

  const items = normalizeMenuItems(Array.isArray(rawItems) ? rawItems : []);

  await prisma.siteSetting.upsert({
    where: { settingKey: 'menu_json' },
    update: { settingValue: JSON.stringify(items), settingGroup: 'navigation', isPublic: false },
    create: { settingKey: 'menu_json', settingValue: JSON.stringify(items), settingGroup: 'navigation', isPublic: false }
  });

  logger.info('Menu updated', { userId: admin.user.userId, items: items.length });
  return NextResponse.json({ ok: true });
}
