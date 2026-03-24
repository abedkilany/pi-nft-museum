import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { clearSystemLogs } from '@/lib/system-log';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
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