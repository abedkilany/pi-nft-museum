import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { getRefreshCookieFromHeaders, getSessionCookieFromHeaders } from '@/lib/auth-cookies';
import { verifyAppSessionToken } from '@/lib/app-session';
import { getActiveSessionByRefreshToken } from '@/lib/session-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const ctx = getRequestContextFromHeaders(request.headers);
  const sessionToken = getSessionCookieFromHeaders(request.headers);
  const refreshToken = getRefreshCookieFromHeaders(request.headers);

  let sessionStatus: 'missing' | 'valid' | 'invalid_or_expired' = 'missing';
  if (sessionToken) {
    try {
      await verifyAppSessionToken(sessionToken);
      sessionStatus = 'valid';
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
  });

  return NextResponse.json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    cookies: {
      sessionPresent: Boolean(sessionToken),
      refreshPresent: Boolean(refreshToken),
      sessionSource: getSessionCookieFromHeaders(request.headers) ? 'cookie' : 'none',
      refreshSource: getRefreshCookieFromHeaders(request.headers) ? 'cookie' : 'none',
    },
    validation: {
      sessionStatus,
      refreshStatus,
    },
  });
}
