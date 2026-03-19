import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { readAuthTokenFromCookieStore } from '@/lib/auth-cookie';
import { getAuthCookieName, verifySessionToken } from '@/lib/auth';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const cookieStore = cookies();
    const headerStore = headers();

    const authHeader = headerStore.get('authorization');
    const bearerToken = extractBearerToken(authHeader);
    const cookieToken = readAuthTokenFromCookieStore(cookieStore);
    const token = bearerToken || cookieToken;

    const authCookieName = getAuthCookieName();
    const presentCookies = [authCookieName].filter((name) =>
      Boolean(cookieStore.get(name)?.value)
    );

    logger.info('AUTH_ME_START', {
      requestId,
      origin: headerStore.get('origin'),
      referer: headerStore.get('referer'),
      host: headerStore.get('host'),
      userAgent: headerStore.get('user-agent'),
      cookieNames: cookieStore.getAll().map((cookie) => cookie.name),
      presentCookies,
      authHeaderPresent: Boolean(authHeader),
      bearerTokenPresent: Boolean(bearerToken),
      cookieTokenPresent: Boolean(cookieToken),
      tokenSource: bearerToken ? 'bearer' : cookieToken ? 'cookie' : 'none',
      tokenFound: Boolean(token),
      tokenLength: token?.length ?? 0,
      tokenPreview: token ? `${token.slice(0, 12)}...` : null,
    });

    if (!token) {
      logger.warn('AUTH_ME_NO_TOKEN', {
        requestId,
        presentCookies,
      });

      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          reason: 'NO_TOKEN',
        },
        { status: 401 }
      );
    }

    let session;
    try {
      session = await verifySessionToken(token);
    } catch (error) {
      logger.warn('AUTH_ME_INVALID_TOKEN', {
        requestId,
        message: error instanceof Error ? error.message : 'Invalid token',
      });

      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          reason: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    logger.info('AUTH_ME_TOKEN_VERIFIED', {
      requestId,
      userId: session?.userId ?? null,
      role: session?.role ?? null,
      username: session?.username ?? null,
      piUid: session?.piUid ?? null,
      piUsername: session?.piUsername ?? null,
    });

    if (!session?.userId) {
      logger.warn('AUTH_ME_SESSION_MISSING_USER_ID', {
        requestId,
      });

      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          reason: 'SESSION_MISSING_USER_ID',
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      include: { role: true },
    });

    logger.info('AUTH_ME_DB_LOOKUP', {
      requestId,
      found: Boolean(user),
      userId: user?.id ?? null,
      username: user?.username ?? null,
      status: user?.status ?? null,
      role: user?.role?.key ?? null,
      piUid: user?.piUid ?? null,
      piUsername: user?.piUsername ?? null,
    });

    if (!user) {
      logger.warn('AUTH_ME_USER_NOT_FOUND', {
        requestId,
        sessionUserId: session.userId,
      });

      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          reason: 'USER_NOT_FOUND',
        },
        { status: 401 }
      );
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      logger.warn('AUTH_ME_USER_BLOCKED', {
        requestId,
        userId: user.id,
        status: user.status,
      });

      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          reason: 'USER_BLOCKED',
        },
        { status: 403 }
      );
    }

    logger.info('AUTH_ME_CONFIRMED', {
      requestId,
      userId: user.id,
      username: user.username,
      role: user.role.key,
    });

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.key,
        piUid: user.piUid,
        piUsername: user.piUsername,
      },
    });
  } catch (error) {
    logger.error('AUTH_ME_FAILED', {
      requestId,
      message: error instanceof Error ? error.message : 'Unknown server error',
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        reason: 'SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}