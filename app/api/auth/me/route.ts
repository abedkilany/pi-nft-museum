import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';
import { getRequestContextFromHeaders } from '@/lib/request-context';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ctx = getRequestContextFromHeaders(request.headers);
  const requestId = ctx.requestId;

  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = extractBearerToken(authHeader);

    logger.info('AUTH_ME_START', {
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
      authHeaderPresent: Boolean(authHeader),
      bearerTokenPresent: Boolean(bearerToken),
      tokenSource: bearerToken ? 'bearer' : 'none',
      authMode: 'short-lived-app-session',
    });

    if (!bearerToken) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'NO_SESSION_TOKEN' },
        { status: 401 }
      );
    }

    const session = await resolvePiSessionFromToken(bearerToken).catch((error) => {
      logger.warn('AUTH_ME_INVALID_TOKEN', {
        feature: 'auth',
        route: '/api/auth/me',
        method: 'GET',
        requestId,
        traceId: ctx.traceId,
        correlationId: ctx.correlationId,
        sessionId: ctx.sessionId,
        ipAddress: ctx.ipAddress,
        message: error instanceof Error ? error.message : 'Invalid token',
      });
      return null;
    });

    if (!session) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'INVALID_OR_EXPIRED_SESSION' },
        { status: 401 }
      );
    }

    logger.info('AUTH_ME_CONFIRMED', {
      feature: 'auth',
      route: '/api/auth/me',
      method: 'GET',
      requestId,
      traceId: ctx.traceId,
      correlationId: ctx.correlationId,
      sessionId: ctx.sessionId,
      ipAddress: ctx.ipAddress,
      userId: session.user.id,
      username: session.user.username,
      role: session.user.role.key,
      source: 'bearer',
      authMode: 'short-lived-app-session',
    });

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role.key,
        piUid: session.user.piUid,
        piUsername: session.user.piUsername,
      },
      source: 'bearer',
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

    return NextResponse.json(
      { ok: false, authenticated: false, reason: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
