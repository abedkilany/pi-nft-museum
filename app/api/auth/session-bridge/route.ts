import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';
import { isAdminRole } from '@/lib/roles';
import { ADMIN_SESSION_BRIDGE_COOKIE, ADMIN_SESSION_BRIDGE_MAX_AGE_SECONDS } from '@/lib/admin-bridge';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing session token.' }, { status: 401 });
  }

  const session = await resolvePiSessionFromToken(token).catch(() => null);
  if (!session?.sessionUser) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired session.' }, { status: 401 });
  }

  if (!isAdminRole(session.sessionUser.role)) {
    return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, role: session.sessionUser.role });
  response.cookies.set({
    name: ADMIN_SESSION_BRIDGE_COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/admin',
    maxAge: ADMIN_SESSION_BRIDGE_MAX_AGE_SECONDS,
  });

  return response;
}
