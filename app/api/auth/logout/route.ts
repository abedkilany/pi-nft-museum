import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { resolveAuthenticatedUserFromHeaders } from '@/lib/bearer-auth';
import { clearAdminBridgeCookie, clearSessionCookies, getRefreshCookieFromHeaders } from '@/lib/auth-cookies';
import { prisma } from '@/lib/prisma';
import { revokeSessionByRefreshToken } from '@/lib/session-registry';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const authResult = await resolveAuthenticatedUserFromHeaders(new Headers(request.headers));
  if (authResult.user?.userId) {
    await prisma.user.update({
      where: { id: authResult.user.userId },
      data: { sessionVersion: { increment: 1 } },
    }).catch(() => null);
  }

  const refreshToken = getRefreshCookieFromHeaders(request.headers) || request.headers.get('x-refresh-token');
  if (refreshToken) {
    await revokeSessionByRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true, authMode: 'cookie-session-with-refresh-rotation' });
  clearSessionCookies(response, request);
  clearAdminBridgeCookie(response, request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
