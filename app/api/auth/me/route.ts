import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/domains/system';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { resolveAuthenticatedUserFromHeaders } from '@/lib/bearer-auth';
import { getAuthorizationSnapshot } from '@/lib/permissions';
import { APP_SESSION_COOKIE, REFRESH_SESSION_COOKIE } from '@/lib/auth-cookies';
import type { AuthMeResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = getRequestContextFromHeaders(request.headers);
  const requestId = ctx.requestId;

  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieNamesSeen = cookieHeader
      .split(';')
      .map((entry) => entry.trim().split('=')[0])
      .filter(Boolean);
    const authResult = await resolveAuthenticatedUserFromHeaders(request.headers);

    logger.debug('AUTH_ME_START', {
      feature: 'auth',
      route: '/api/auth/me',
      method: 'GET',
      requestId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
      sessionId: ctx.sessionId,
      ipAddress: ctx.ipAddress,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authHeaderPresent: authResult.hasAuthorizationHeader,
      bearerTokenPresent: authResult.source === 'bearer',
      malformedAuthHeader: authResult.hasMalformedAuthorizationHeader,
      tokenSource: authResult.source,
      authResolution: authResult.reason,
      authMode: 'short-lived-app-session',
      cookieHeaderPresent: cookieHeader.length > 0,
      cookieNamesSeen,
      hasAppSessionCookie: cookieNamesSeen.includes(APP_SESSION_COOKIE),
      hasRefreshSessionCookie: cookieNamesSeen.includes(REFRESH_SESSION_COOKIE),
    });

    if (!authResult.user) {
      const reason = authResult.reason === 'malformed_bearer_token'
        ? 'MALFORMED_AUTHORIZATION_HEADER'
        : authResult.reason === 'invalid_or_expired_session'
          ? 'INVALID_OR_EXPIRED_SESSION'
          : 'NO_SESSION_TOKEN';

      if (authResult.reason === 'invalid_or_expired_session' || authResult.reason === 'malformed_bearer_token') {
        logger.warn('AUTH_ME_REJECTED', {
          feature: 'auth',
          route: '/api/auth/me',
          method: 'GET',
          requestId,
          traceId: ctx.traceId,
          correlationId: ctx.correlationId,
          sessionId: ctx.sessionId,
          ipAddress: ctx.ipAddress,
          authResolution: authResult.reason,
        });
      }

      return NextResponse.json<AuthMeResponse>(
        { ok: false, authenticated: false, reason },
        { status: 401 }
      );
    }

    const authz = await getAuthorizationSnapshot(authResult.user);

    logger.debug('AUTH_ME_CONFIRMED', {
      feature: 'auth',
      route: '/api/auth/me',
      method: 'GET',
      requestId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
      sessionId: ctx.sessionId,
      ipAddress: ctx.ipAddress,
      userId: authResult.user.userId,
      username: authResult.user.username,
      role: authResult.user.role,
      source: authResult.source,
      authMode: 'short-lived-app-session',
      cookieHeaderPresent: cookieHeader.length > 0,
      cookieNamesSeen,
      hasAppSessionCookie: cookieNamesSeen.includes(APP_SESSION_COOKIE),
      hasRefreshSessionCookie: cookieNamesSeen.includes(REFRESH_SESSION_COOKIE),
    });

    return NextResponse.json<AuthMeResponse>({
      ok: true,
      authenticated: true,
      user: {
        id: authResult.user.userId,
        username: authResult.user.username,
        email: authResult.user.email,
        role: authResult.user.role,
        permissions: authz.permissions,
        adminPanelAccess: authz.canAccessAdmin,
        piUid: authResult.user.piUid,
        piUsername: authResult.user.piUsername,
      },
      source: authResult.source,
    });
  } catch (error) {
    logger.error('AUTH_ME_FAILED', {
      feature: 'auth',
      route: '/api/auth/me',
      method: 'GET',
      requestId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
      sessionId: ctx.sessionId,
      ipAddress: ctx.ipAddress,
      message: error instanceof Error ? error.message : 'Unknown server error',
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json<AuthMeResponse>(
      { ok: false, authenticated: false, reason: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
