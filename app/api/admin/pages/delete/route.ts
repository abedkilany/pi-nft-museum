import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.pagesManage);
  if ('error' in admin) return admin.error;

  try {
    const body = await request.json();
    const pageId = Number(body.pageId || 0);
    if (!pageId) {
      return NextResponse.json({ error: 'Page id is required.' }, { status: 400 });
    }

    await prisma.page.delete({ where: { id: pageId } });
    logger.info('Page deleted', { userId: admin.user.userId, pageId });
    return NextResponse.json({ ok: true, message: 'Page deleted.' });
  } catch (error) {
    logger.error('Failed to delete page', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}