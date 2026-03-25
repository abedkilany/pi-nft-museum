import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminSessionFromCookieHeader } from '@/lib/admin-session';
import { getAuthorizationSnapshot } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await resolveAdminSessionFromCookieHeader(request.headers.get('cookie'));
  if (!session?.sessionUser) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const authz = await getAuthorizationSnapshot(session.sessionUser);
  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: session.sessionUser.userId,
      username: session.sessionUser.username,
      email: session.sessionUser.email,
      role: session.sessionUser.role,
      permissions: authz.permissions,
      adminPanelAccess: authz.canAccessAdmin,
    },
  });
}
