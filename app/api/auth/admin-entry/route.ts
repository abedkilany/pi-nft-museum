import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromHeaders } from '@/lib/current-user';
import { issueAdminBridgeToken } from '@/lib/admin-bridge';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';
import { assertSameOrigin } from '@/lib/security';
import { setAdminBridgeCookie, setSessionCookies } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

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

  const grant = await issueAdminBridgeToken({
    userId: dbUser.id,
    role: dbUser.role.key,
    piUid: dbUser.piUid,
    piUsername: dbUser.piUsername,
    sessionVersion: dbUser.sessionVersion,
    roleVersion: dbUser.roleVersion,
    expiresInSeconds: 5 * 60,
  });

  const response = NextResponse.json({ ok: true, url: '/admin' });
  const sessionToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
  const refreshToken = request.headers.get('x-refresh-token')?.trim() || null;
  if (sessionToken && refreshToken) {
    setSessionCookies(response, { sessionToken, refreshToken }, request);
  }
  setAdminBridgeCookie(response, grant, request);
  return response;
}
