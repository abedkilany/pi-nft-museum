import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createSessionToken, getAuthCookieName, verifySessionToken } from '@/lib/auth';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

export const dynamic = 'force-dynamic';

function buildSecureCookieBase(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';

  return {
    secure: isSecure,
    sameSite: 'none' as const,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

function attachSessionCookie(response: NextResponse, request: NextRequest, sessionToken: string) {
  response.cookies.set({
    name: getAuthCookieName(),
    value: sessionToken,
    httpOnly: true,
    ...buildSecureCookieBase(request),
  });
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = extractBearerToken(authHeader);
    const sessionCookie = request.cookies.get(getAuthCookieName())?.value;

    logger.info('AUTH_ME_START', {
      requestId,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authHeaderPresent: Boolean(authHeader),
      bearerTokenPresent: Boolean(bearerToken),
      sessionCookiePresent: Boolean(sessionCookie),
      tokenSource: bearerToken ? 'bearer' : sessionCookie ? 'session-cookie' : 'none',
    });

    if (bearerToken) {
      const session = await resolvePiSessionFromToken(bearerToken).catch((error) => {
        logger.warn('AUTH_ME_INVALID_TOKEN', {
          requestId,
          message: error instanceof Error ? error.message : 'Invalid token',
        });
        return null;
      });

      if (!session) {
        return NextResponse.json(
          { ok: false, authenticated: false, reason: 'INVALID_OR_UNKNOWN_PI_USER' },
          { status: 401 }
        );
      }

      logger.info('AUTH_ME_CONFIRMED', {
        requestId,
        userId: session.user.id,
        username: session.user.username,
        role: session.user.role.key,
        source: 'bearer',
        rehydratedSession: true,
      });

      const response = NextResponse.json({
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
        rehydratedSession: true,
      });

      const sessionToken = await createSessionToken(session.sessionUser);
      attachSessionCookie(response, request, sessionToken);
      return response;
    }

    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'NO_SESSION_OR_TOKEN' },
        { status: 401 }
      );
    }

    const sessionUser = await verifySessionToken(sessionCookie).catch((error) => {
      logger.warn('AUTH_ME_INVALID_SESSION_COOKIE', {
        requestId,
        message: error instanceof Error ? error.message : 'Invalid session cookie',
      });
      return null;
    });

    if (!sessionUser) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'INVALID_SESSION_COOKIE' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: sessionUser.userId,
        username: sessionUser.username,
        email: sessionUser.email,
        role: sessionUser.role,
        piUid: sessionUser.piUid,
        piUsername: sessionUser.piUsername,
      },
      source: 'session-cookie',
    });
  } catch (error) {
    logger.error('AUTH_ME_FAILED', {
      requestId,
      message: error instanceof Error ? error.message : 'Unknown server error',
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      { ok: false, authenticated: false, reason: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
