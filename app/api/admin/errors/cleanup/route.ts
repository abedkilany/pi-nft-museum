import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.logsView);
  if ('error' in admin) return admin.error;

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.errorLog.deleteMany({
    where: {
      status: { in: ['RESOLVED', 'IGNORED'] },
      lastSeenAt: { lt: sixtyDaysAgo },
    },
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ERRORS_CLEANUP',
    targetType: 'ERROR_LOG',
    targetId: 'resolved-older-than-60-days',
    newValues: { deletedCount: deleted.count },
  });

  return NextResponse.redirect(new URL('/admin/errors', request.url));
}
