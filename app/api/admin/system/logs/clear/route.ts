import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { clearSystemLogs } from '@/lib/system-log';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi(PERMISSIONS.logsView);
  if ('error' in admin) return admin.error;

  await clearSystemLogs();
  logger.info('System logs cleared', { userId: admin.user.userId });
  return NextResponse.redirect(new URL('/admin/system', request.url));
}