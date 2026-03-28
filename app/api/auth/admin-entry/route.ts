import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/domains/auth';
import { issueAdminHandoffToken } from '@/lib/admin-bridge';
import { ADMIN_DEVICE_REQUIRED_PATH, isSecureAdminDevice } from '@/lib/domains/admin';
import { prisma } from '@/lib/domains/system';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';
import { assertSameOrigin } from '@/lib/services/request';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  if (!(await isSecureAdminDevice())) {
    return NextResponse.json({
      ok: false,
      error: 'This device is not secure enough for the admin panel. Please use a supported desktop browser.',
      reason: 'ADMIN_DEVICE_NOT_ALLOWED',
      redirectUrl: ADMIN_DEVICE_REQUIRED_PATH,
    }, { status: 403 });
  }

  const currentUser = await getCurrentUserFromHeaders(request.headers);
  if (!currentUser) {
    return NextResponse.json({ ok: false, error: 'Authentication required.', reason: 'NO_SESSION_TOKEN' }, { status: 401 });
  }

  if (!(await userHasPermission(currentUser, PERMISSIONS.adminAccess))) {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    include: { role: true },
  });

  if (!dbUser || !(await userHasPermission({ userId: dbUser.id, username: dbUser.username, email: dbUser.email, role: dbUser.role.key }, PERMISSIONS.adminAccess))) {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  const grant = await issueAdminHandoffToken({
    userId: dbUser.id,
    role: dbUser.role.key,
    piUid: dbUser.piUid,
    piUsername: dbUser.piUsername,
    sessionVersion: dbUser.sessionVersion,
    roleVersion: dbUser.roleVersion,
    expiresInSeconds: 60,
  });

  const response = NextResponse.json({ ok: true, url: '/admin/handoff', grant });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
