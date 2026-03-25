import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyRateLimit, assertSameOrigin } from '@/lib/security';
import { getRefreshCookieFromHeaders, setSessionCookies, clearSessionCookies } from '@/lib/auth-cookies';
import { issueAppSessionToken } from '@/lib/app-session';
import { buildRefreshTokenValue, getActiveSessionByRefreshToken, rotateRefreshSession } from '@/lib/session-registry';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const rateLimitError = applyRateLimit(request, ['auth-refresh'], 'auth-refresh', [
    { limit: 20, windowMs: 10 * 60 * 1000 },
    { limit: 100, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const refreshToken = getRefreshCookieFromHeaders(request.headers);
  if (!refreshToken) {
    const response = NextResponse.json({ ok: false, error: 'Refresh token is missing.', reason: 'NO_REFRESH_TOKEN' }, { status: 401 });
    clearSessionCookies(response, request);
    return response;
  }

  const sessionEntry = await getActiveSessionByRefreshToken(refreshToken);
  if (!sessionEntry) {
    const response = NextResponse.json({ ok: false, error: 'Refresh token is invalid or expired.', reason: 'INVALID_OR_EXPIRED_REFRESH_SESSION' }, { status: 401 });
    clearSessionCookies(response, request);
    return response;
  }

  const user = await prisma.user.findUnique({ where: { id: sessionEntry.userId }, include: { role: true } });
  if (!user || user.status === 'BANNED' || user.status === 'SUSPENDED') {
    const response = NextResponse.json({ ok: false, error: 'Account is not allowed to refresh this session.' }, { status: 403 });
    clearSessionCookies(response, request);
    return response;
  }

  const session = await issueAppSessionToken({
    userId: user.id,
    role: user.role.key,
    piUid: user.piUid,
    piUsername: user.piUsername,
    sessionVersion: user.sessionVersion,
    roleVersion: user.roleVersion,
  });
  const nextRefreshToken = buildRefreshTokenValue();

  await rotateRefreshSession({
    oldRefreshToken: refreshToken,
    newRefreshToken: nextRefreshToken,
    newJti: session.jti,
    expiresAt: new Date(session.expiresAt),
    refreshExpiresAt: new Date(session.refreshExpiresAt),
    headers: request.headers,
  });

  const response = NextResponse.json({
    ok: true,
    authMode: 'cookie-session-with-refresh-rotation',
    session: {
      expiresInSeconds: session.expiresInSeconds,
      expiresAt: session.expiresAt,
      refreshExpiresAt: session.refreshExpiresAt,
    },
  });
  setSessionCookies(response, { sessionToken: session.token, refreshToken: nextRefreshToken }, request);
  return response;
}
