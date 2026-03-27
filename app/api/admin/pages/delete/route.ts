import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { requireAdminApi } from '@/lib/domains/admin';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { readJsonObject, getNumberField } from '@/lib/services/request';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  try {
    const parsedBody = await readJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;

    const pageIdResult = getNumberField(parsedBody.data, 'pageId', { required: true, integer: true, min: 1 });
    if (!pageIdResult.ok) return pageIdResult.response;
    const pageId = pageIdResult.data;

    await prisma.page.delete({ where: { id: pageId } });
    logger.info('Page deleted', { userId: admin.user.userId, pageId });
    return NextResponse.json({ ok: true, message: 'Page deleted.' });
  } catch (error) {
    logger.error('Failed to delete page', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
