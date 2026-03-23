import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { normalizeMenuItems } from '@/lib/menu';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const body = await request.json();
  const items = normalizeMenuItems(body.items || []);

  await prisma.siteSetting.upsert({
    where: { settingKey: 'menu_json' },
    update: { settingValue: JSON.stringify(items), settingGroup: 'navigation', isPublic: false },
    create: { settingKey: 'menu_json', settingValue: JSON.stringify(items), settingGroup: 'navigation', isPublic: false }
  });

  logger.info('Menu updated', { userId: admin.user.userId, items: items.length });
  return NextResponse.json({ ok: true });
}