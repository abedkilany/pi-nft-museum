import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminContextUser } from '@/lib/current-user';
import { setSessionCookies } from '@/lib/auth-cookies';
import { PERMISSIONS, userHasPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentAdminContextUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, error: 'Admin authentication is still unavailable on this device.' }, { status: 401 });
  }

  if (!(await userHasPermission(currentUser, PERMISSIONS.adminAccess))) {
    return NextResponse.json({ ok: false, error: 'You do not have permission to access the admin panel.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const returnTo = typeof body?.returnTo === 'string' && body.returnTo.startsWith('/admin')
    ? body.returnTo
    : '/admin';

  const authHeader = request.headers.get('authorization') || '';
  const refreshToken = request.headers.get('x-refresh-token') || '';
  const sessionToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const response = NextResponse.json({ ok: true, returnTo });
  response.headers.set('Cache-Control', 'no-store');

  if (sessionToken && refreshToken) {
    setSessionCookies(response, { sessionToken, refreshToken }, request);
  }

  return response;
}
