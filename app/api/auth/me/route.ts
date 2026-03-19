import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const authHeader = request.headers.get('authorization');
    const bearerToken = extractBearerToken(authHeader);

    logger.info('AUTH_ME_START', {
      requestId,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      authHeaderPresent: Boolean(authHeader),
      bearerTokenPresent: Boolean(bearerToken),
      tokenSource: bearerToken ? 'bearer' : 'none',
      tokenFound: Boolean(bearerToken),
      tokenLength: bearerToken?.length ?? 0,
      tokenPreview: bearerToken ? `${bearerToken.slice(0, 12)}...` : null,
    });

    if (!bearerToken) {
      return NextResponse.json(
        { ok: false, authenticated: false, reason: 'NO_TOKEN' },
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

    logger.info('AUTH_ME_TOKEN_VERIFIED', {
      requestId,
      userId: session.user.id,
      role: session.user.role.key,
      username: session.user.username,
      piUid: session.piUser.uid,
      piUsername: session.piUser.username || null,
    });

    logger.info('AUTH_ME_DB_LOOKUP', {
      requestId,
      found: true,
      userId: session.user.id,
      username: session.user.username,
      status: session.user.status,
      role: session.user.role.key,
      piUid: session.user.piUid,
      piUsername: session.user.piUsername,
    });

    logger.info('AUTH_ME_CONFIRMED', {
      requestId,
      userId: session.user.id,
      username: session.user.username,
      role: session.user.role.key,
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