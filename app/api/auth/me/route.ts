import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifySessionToken } from '@/lib/auth';
import { readAuthTokenFromCookieStore } from '@/lib/auth-cookie';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = extractBearerToken(authHeader);
    const cookieToken = readAuthTokenFromCookieStore(request.cookies);

    logger.info('AUTH_ME_START', {
      requestId,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authHeaderPresent: Boolean(authHeader),
      bearerTokenPresent: Boolean(bearerToken),
      cookieTokenPresent: Boolean(cookieToken),
      tokenSource: cookieToken ? 'cookie' : bearerToken ? 'bearer' : 'none',
    });

    if (cookieToken) {
      const sessionUser = await verifySessionToken(cookieToken).catch((error) => {
        logger.warn('AUTH_ME_INVALID_COOKIE', {
          requestId,
          message: error instanceof Error ? error.message : 'Invalid session cookie',
        });
        return null;
      });

      if (sessionUser) {
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
        });
      }
    }

    if (!bearerToken) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'NO_SESSION' },
        { status: 401 }
      );
    }

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
