import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { APP_SESSION_COOKIE, REFRESH_SESSION_COOKIE, getRefreshCookieFromHeaders, getSessionCookieFromHeaders } from '@/lib/auth-cookies';
import { verifyAppSessionToken } from '@/lib/app-session';
import { getActiveSessionByRefreshToken } from '@/lib/session-registry';

export const dynamic = 'force-dynamic';

function mask(value: string | null) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const ctx = getRequestContextFromHeaders(request.headers);

  const cookieHeader = request.headers.get('cookie') || '';
  const sessionToken = getSessionCookieFromHeaders(request.headers);
  const refreshToken = getRefreshCookieFromHeaders(request.headers);

  let sessionStatus: 'missing' | 'valid' | 'invalid_or_expired' = 'missing';
  let sessionClaims: Record<string, unknown> | null = null;
  if (sessionToken) {
    try {
      const claims = await verifyAppSessionToken(sessionToken);
      sessionStatus = 'valid';
      sessionClaims = {
        sub: claims.sub,
        role: claims.role,
        sv: claims.sv,
        rv: claims.rv,
        jti: claims.jti,
        exp: claims.exp ?? null,
      };
    } catch {
      sessionStatus = 'invalid_or_expired';
    }
  }

  let refreshStatus: 'missing' | 'active' | 'unknown_or_expired' = 'missing';
  if (refreshToken) {
    const entry = await getActiveSessionByRefreshToken(refreshToken);
    refreshStatus = entry ? 'active' : 'unknown_or_expired';
  }

  logger.info('AUTH_SESSION_DEBUG_REQUESTED', {
    feature: 'auth',
    route: '/api/auth/session-debug',
    method: 'GET',
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    correlationId: ctx.correlationId,
    sessionId: ctx.sessionId,
    ipAddress: ctx.ipAddress,
    cookieHeaderPresent: cookieHeader.length > 0,
  });

  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    request: {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      xForwardedProto: request.headers.get('x-forwarded-proto'),
      secFetchSite: request.headers.get('sec-fetch-site'),
      cookieHeaderPresent: cookieHeader.length > 0,
      cookieNamesSeen: cookieHeader
        .split(';')
        .map((entry) => entry.trim().split('=')[0])
        .filter(Boolean),
    },
    cookies: {
      names: {
        session: APP_SESSION_COOKIE,
        refresh: REFRESH_SESSION_COOKIE,
      },
      sessionPresent: Boolean(sessionToken),
      refreshPresent: Boolean(refreshToken),
      sessionPreview: mask(sessionToken),
      refreshPreview: mask(refreshToken),
    },
    validation: {
      sessionStatus,
      refreshStatus,
      sessionClaims,
    },
    error:
      !sessionToken && !refreshToken
        ? 'No auth cookies reached the server on this request.'
        : !sessionToken
          ? 'Refresh cookie reached the server, but the main session cookie is missing.'
          : sessionStatus !== 'valid'
            ? 'Session cookie reached the server, but it is invalid or expired.'
            : refreshStatus === 'unknown_or_expired'
              ? 'Refresh cookie reached the server, but it is not active in the session registry.'
              : null,
  });
}
