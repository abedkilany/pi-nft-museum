import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';
import { assertSameOrigin } from '@/lib/security';
import { cleanupObservabilityEvents } from '@/lib/app-events';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.logsView);
  if ('error' in admin) return admin.error;

  const result = await cleanupObservabilityEvents();

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_EVENTS_CLEANUP',
    targetType: 'APP_EVENT',
    targetId: 'retention-policy',
    newValues: result,
  });

  return NextResponse.redirect(new URL('/admin/events?preset=important', request.url));
}
