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
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
  }

  const refreshToken = request.headers.get('x-refresh-token')?.trim() || null;
  const sessionToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
  const body = await request.json().catch(() => ({} as { includeAdminBridge?: boolean }));

  const response = NextResponse.json({ ok: true });

  if (sessionToken && refreshToken) {
    setSessionCookies(response, { sessionToken, refreshToken }, request);
  }

  if (body?.includeAdminBridge) {
    const dbUser = await prisma.user.findUnique({ where: { id: currentUser.userId }, include: { role: true } });
    if (dbUser && await userHasPermission({ userId: dbUser.id, username: dbUser.username, email: dbUser.email, role: dbUser.role.key }, PERMISSIONS.adminAccess)) {
      const grant = await issueAdminBridgeToken({
        userId: dbUser.id,
        role: dbUser.role.key,
        piUid: dbUser.piUid,
        piUsername: dbUser.piUsername,
        sessionVersion: dbUser.sessionVersion,
        roleVersion: dbUser.roleVersion,
        expiresInSeconds: 15 * 60,
      });
      setAdminBridgeCookie(response, grant, request);
    }
  }

  response.headers.set('Cache-Control', 'no-store');
  return response;
}
