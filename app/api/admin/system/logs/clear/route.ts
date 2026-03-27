import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/domains/admin';
import { clearSystemLogs } from '@/lib/system-log';
import { logger } from '@/lib/domains/system';
import { assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  await clearSystemLogs();

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_SYSTEM_LOGS_CLEARED',
    targetType: 'SYSTEM_LOGS',
    targetId: 'all'
  });

  logger.info('System logs cleared', { userId: admin.user.userId });
  return NextResponse.redirect(new URL('/admin/system', request.url));
}