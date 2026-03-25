import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiBootstrapRoleKey,
} from '@/lib/pi-auth';
import { applyRateLimit, assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { issueAppSessionToken } from '@/lib/app-session';
import { describeCookiePolicy, setSessionCookies } from '@/lib/auth-cookies';
import { buildRefreshTokenValue, createSessionRegistryEntry } from '@/lib/session-registry';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { safeError } from '@/lib/safe-response';

function shouldPreferPiBrowserBearerFallback(userAgent: string | null | undefined) {
  if (!userAgent) return false;

  const ua = userAgent.toLowerCase();

  const isPiBrowser =
    ua.includes('pibrowser') ||
    ua.includes('pi browser') ||
    ua.includes('minepi');

  const isIOS =
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    (ua.includes('ios') && !ua.includes('android'));

  return isPiBrowser && isIOS;
}

export async function POST(request: Request) {
  const ctx = getRequestContextFromHeaders(request.headers);
  const baseMeta = {
    feature: 'auth',
    route: '/api/auth/pi/login',
    method: 'POST',
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    correlationId: ctx.correlationId,
    sessionId: ctx.sessionId,
    ipAddress: ctx.ipAddress,
  };

  logger.info('PI_LOGIN_ROUTE_START', {
    ...baseMeta,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    secFetchSite: request.headers.get('sec-fetch-site'),
    secFetchMode: request.headers.get('sec-fetch-mode'),
    xAppRequest: request.headers.get('x-app-request'),
    contentType: request.headers.get('content-type'),
    userAgent: request.headers.get('user-agent'),
  });

  const csrfError = assertSameOrigin(request);
  if (csrfError) {
    logger.warn('PI_LOGIN_ROUTE_BLOCKED_BY_ORIGIN_CHECK', {
      ...baseMeta,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      secFetchSite: request.headers.get('sec-fetch-site'),
      secFetchMode: request.headers.get('sec-fetch-mode'),
      xAppRequest: request.headers.get('x-app-request'),
    });
    return csrfError;
  }

  try {
    const rateLimitError = applyRateLimit(request, ['pi-login'], 'auth-pi-login', [
      { limit: 10, windowMs: 10 * 60 * 1000 },
      { limit: 40, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    logger.info('PI_LOGIN_ROUTE_BODY_PARSED', {
      ...baseMeta,
      hasAccessToken: Boolean(body?.accessToken),
    });

    const accessToken = String(body.accessToken || '').trim();

    logger.info('Pi login request received', {
      ...baseMeta,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      authMode: 'short-lived-app-session',
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'Pi access token is required.' }, { status: 400 });
    }

    const piUser = await fetchPiUser(accessToken);
    logger.info('PI_LOGIN_ROUTE_PI_USER_FETCHED', {
      ...baseMeta,
      piUid: piUser?.uid || null,
      piUsername: piUser?.username || null,
    });

    if (!piUser?.uid) {
      return NextResponse.json({ error: 'Pi did not return a valid user id.' }, { status: 401 });
    }

    const usernameSource = piUser.username || `pi-user-${piUser.uid.slice(0, 8)}`;
    const syntheticEmail = buildSyntheticEmail(piUser.uid);

    let bootstrapRoleKey: string | null = null;
    let roleSource: 'bootstrap-env' | 'database' = 'database';

    let user = await prisma.user.findUnique({
      where: { piUid: piUser.uid },
      include: { role: true },
    });

    if (!user && piUser.username) {
      user = await prisma.user.findFirst({
        where: {
          OR: [{ piUsername: piUser.username }, { username: piUser.username }],
        },
        include: { role: true },
      });
    }

    if (!user) {
      bootstrapRoleKey = resolvePiBootstrapRoleKey(piUser);
      logger.info('PI_LOGIN_ROUTE_BOOTSTRAP_ROLE_RESOLVED', {
        ...baseMeta,
        bootstrapRoleKey,
        piUid: piUser.uid,
      });

      const bootstrapRole = await prisma.role.findUnique({
        where: { key: bootstrapRoleKey },
      });

      if (!bootstrapRole) {
        return NextResponse.json(
          { error: `Role "${bootstrapRoleKey}" is not configured in the database.` },
          { status: 500 },
        );
      }

      const username = await ensureUniqueUsername(usernameSource);
      user = await prisma.user.create({
        data: {
          username,
          fullName: piUser.username || username,
          email: syntheticEmail,
          passwordHash: null,
          roleId: bootstrapRole.id,
          status: 'ACTIVE',
          piUid: piUser.uid,
          piUsername: piUser.username || username,
          piWalletAddress: piUser.wallet_address || null,
          piLinkedAt: new Date(),
          piAuthVerified: true,
          lastLoginAt: new Date(),
        },
        include: { role: true },
      });

      roleSource = 'bootstrap-env';

      logger.info('PI_LOGIN_ROUTE_USER_BOOTSTRAPPED', {
        ...baseMeta,
        userId: user.id,
        piUid: piUser.uid,
        roleKey: user.role.key,
        roleSource,
      });
    } else {
      const username = await ensureUniqueUsername(piUser.username || user.username, user.id);

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          fullName: user.fullName || piUser.username || username,
          email: user.email || syntheticEmail,
          status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
          piUid: piUser.uid,
          piUsername: piUser.username || user.piUsername || username,
          piWalletAddress: piUser.wallet_address || user.piWalletAddress || null,
          piLinkedAt: user.piLinkedAt || new Date(),
          piAuthVerified: true,
          lastLoginAt: new Date(),
        },
        include: { role: true },
      });
    }

    if (!user.role) {
      return NextResponse.json({ error: 'User role is missing from the database.' }, { status: 500 });
    }

    if (!user.piUsername && piUser.username) {
      logger.warn('PI_LOGIN_ROUTE_PI_USERNAME_MISSING_AFTER_UPDATE', {
        ...baseMeta,
        userId: user.id,
        piUid: piUser.uid,
      });
    }

    if (!user.lastLoginAt) {
      logger.warn('PI_LOGIN_ROUTE_LAST_LOGIN_MISSING_AFTER_UPDATE', {
        ...baseMeta,
        userId: user.id,
        piUid: piUser.uid,
      });
    }

    logger.info('PI_LOGIN_ROUTE_ROLE_RESOLVED', {
      ...baseMeta,
      userId: user.id,
      piUid: piUser.uid,
      bootstrapRoleKey,
      resolvedRoleKey: user.role.key,
      roleSource,
      sessionVersion: user.sessionVersion,
      roleVersion: user.roleVersion,
    });

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      logger.warn('PI_LOGIN_ROUTE_BLOCKED_BY_STATUS', {
        ...baseMeta,
        userId: user.id,
        role: user.role.key,
        status: user.status,
        sessionVersion: user.sessionVersion,
        roleVersion: user.roleVersion,
      });

      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        targetType: 'USER',
        targetId: user.id,
        newValues: {
          status: user.status,
          feature: 'auth',
          route: '/api/auth/pi/login',
          requestId: ctx.requestId,
          traceId: ctx.traceId,
          correlationId: ctx.correlationId,
          sessionId: ctx.sessionId,
        },
      });

      return NextResponse.json(
        { error: 'Your account is not allowed to sign in right now.' },
        { status: 403 },
      );
    }

    const session = await issueAppSessionToken({
      userId: user.id,
      role: user.role.key,
      piUid: user.piUid,
      piUsername: user.piUsername,
      sessionVersion: user.sessionVersion,
      roleVersion: user.roleVersion,
    });

    const refreshToken = buildRefreshTokenValue();

    await createSessionRegistryEntry({
      userId: user.id,
      jti: session.jti,
      refreshToken,
      expiresAt: new Date(session.expiresAt),
      refreshExpiresAt: new Date(session.refreshExpiresAt),
      headers: request.headers,
    });

    logger.info('PI_LOGIN_ROUTE_SESSION_ISSUED', {
      ...baseMeta,
      userId: user.id,
      role: user.role.key,
      sessionVersion: user.sessionVersion,
      roleVersion: user.roleVersion,
      jti: session.jti,
    });

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      newValues: {
        role: user.role.key,
        piUid: user.piUid,
        authMode: 'short-lived-app-session',
        feature: 'auth',
        route: '/api/auth/pi/login',
        requestId: ctx.requestId,
        traceId: ctx.traceId,
        correlationId: ctx.correlationId,
        sessionId: ctx.sessionId,
      },
    });

    const prefersClientFallback = shouldPreferPiBrowserBearerFallback(request.headers.get('user-agent'));
    const includeClientFallback = true;
    const transport = includeClientFallback ? 'token-session-with-cookie-backup' : 'cookie-session';

    const response = NextResponse.json({
      ok: true,
      message: 'Connected with Pi.',
      authMode: includeClientFallback
        ? 'token-first-session-with-cookie-backup'
        : 'cookie-session-with-refresh-rotation',
      session: {
        expiresInSeconds: session.expiresInSeconds,
        expiresAt: session.expiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
        transport,
      },
      fallback: includeClientFallback
        ? {
            enabled: true,
            sessionToken: session.token,
            refreshToken,
            transport: 'session-storage-bearer-fallback',
            reason: prefersClientFallback ? 'preferred-for-cookie-restricted-client' : 'token-first-client-session',
          }
        : { enabled: false },
      user: {
        id: user.id,
        username: user.username,
        role: user.role.key,
        piUsername: user.piUsername,
      },
    });

    setSessionCookies(response, { sessionToken: session.token, refreshToken }, request);

    const cookiePolicy = describeCookiePolicy(request);
    logger.info('PI_LOGIN_ROUTE_COOKIES_SET', {
      ...baseMeta,
      userId: user.id,
      role: user.role.key,
      cookieNames: ['pi_app_session', 'pi_refresh_session'],
      secure: cookiePolicy.secure,
      sameSite: cookiePolicy.sameSite,
      path: cookiePolicy.path,
      sessionMaxAge: cookiePolicy.sessionMaxAge,
      refreshMaxAge: cookiePolicy.refreshMaxAge,
      setCookieHeaderCount:
        typeof response.headers.getSetCookie === 'function'
          ? response.headers.getSetCookie().length
          : null,
    });

    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Auth-Session-Mode', includeClientFallback ? 'token-first-session-with-cookie-backup' : 'cookie-session-with-refresh-rotation');
    response.headers.set('X-Auth-Transport', transport);

    return response;
  } catch (error) {
    logger.error('PI_LOGIN_ROUTE_FAILED', {
      ...baseMeta,
      message: error instanceof Error ? error.message : 'Unknown server error',
      stack: error instanceof Error ? error.stack : null,
    });

    return safeError(error);
  }
}