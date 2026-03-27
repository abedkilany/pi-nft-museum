import { UserStatus } from '@/types/enums';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/domains/system';
import { logger } from '@/lib/domains/system';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiBootstrapRoleKey,
} from '@/lib/domains/pi';
import { applyRateLimit, assertSameOrigin } from '@/lib/services/request';
import { createAuditLog } from '@/lib/audit';
import { issueAppSessionToken } from '@/lib/domains/auth';
import { describeCookiePolicy, setSessionCookies } from '@/lib/auth-cookies';
import { buildRefreshTokenValue, createSessionRegistryEntry } from '@/lib/session-registry';
import { getRequestContextFromHeaders } from '@/lib/request-context';
import { getOptionalBooleanField, getStringField, readJsonObject } from '@/lib/services/request';
import type { AuthResponse, UserRole } from '@/types/auth';

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

    const parsedBody = await readJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;

    const accessTokenResult = getStringField(parsedBody.data, 'accessToken', { required: true, maxLength: 4096 });
    if (!accessTokenResult.ok) return accessTokenResult.response;
    const accessToken = accessTokenResult.data;
    const requiresFallbackAuth = getOptionalBooleanField(parsedBody.data, 'requiresFallbackAuth', false);

    logger.info('PI_LOGIN_ROUTE_BODY_PARSED', {
      ...baseMeta,
      hasAccessToken: Boolean(accessToken),
      requiresFallbackAuth,
    });

    logger.info('Pi login request received', {
      ...baseMeta,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      authMode: 'short-lived-app-session',
    });

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

    let bootstrapRoleKey: UserRole | null = null;
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
      bootstrapRoleKey = resolvePiBootstrapRoleKey(piUser) as UserRole;
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
          status: UserStatus.ACTIVE,
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
          status: user.status === UserStatus.PENDING ? UserStatus.ACTIVE : user.status,
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

    if (user.status === UserStatus.BANNED || user.status === 'SUSPENDED') {
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
          ipAddress: ctx.ipAddress,
        },
      });

      return NextResponse.json<AuthResponse>(
        {
          error:
            user.status === UserStatus.BANNED
              ? 'Your account has been banned. Please contact support.'
              : 'Your account is suspended. Please contact support.',
        },
        { status: 403 },
      );
    }

    const session = await issueAppSessionToken({
      userId: user.id,
      role: user.role.key,
      roleVersion: user.roleVersion,
      sessionVersion: user.sessionVersion,
      piUid: user.piUid,
      piUsername: user.piUsername,
    });

    const refreshToken = buildRefreshTokenValue();
    const now = new Date();
    const refreshExpiresAt = new Date(now.getTime() + session.refreshExpiresInSeconds * 1000);

    await createSessionRegistryEntry({
      userId: user.id,
      jti: session.jti,
      refreshToken,
      expiresAt: new Date(session.expiresAt),
      refreshExpiresAt,
      headers: request.headers,
    });

    const userAgent = request.headers.get('user-agent');
    const prefersFallbackByUa = shouldPreferPiBrowserBearerFallback(userAgent);
    const prefersFallbackByHeader = request.headers.get('x-auth-mode') === 'fallback';
    const includeFallbackTokens = requiresFallbackAuth || prefersFallbackByHeader || prefersFallbackByUa;

    const responseBody: AuthResponse = {
      ok: true,
      message: 'Authenticated with Pi successfully.',
      authMode: 'cookie-session-with-refresh-rotation',
      session: {
        expiresInSeconds: session.expiresInSeconds,
        expiresAt: session.expiresAt,
        refreshExpiresAt: refreshExpiresAt.toISOString(),
        ...(includeFallbackTokens
          ? {
              token: session.token,
              refreshToken,
              transport: 'pi-browser-bearer-fallback' as const,
            }
          : {
              transport: 'cookie-session' as const,
            }),
      },
      user: {
        id: user.id,
        username: user.username,
        email: user.email || undefined,
        role: user.role.key,
        piUid: user.piUid,
        piUsername: user.piUsername,
      },
    };

    const response = NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Auth-Cookie-Policy': JSON.stringify(describeCookiePolicy(request)),
      },
    });

    setSessionCookies(
      response,
      {
        sessionToken: session.token,
        refreshToken,
      },
      request,
    );

    logger.info('PI_LOGIN_ROUTE_SUCCESS', {
      ...baseMeta,
      userId: user.id,
      role: user.role.key,
      status: user.status,
      prefersFallbackByUa,
      prefersFallbackByHeader,
      requiresFallbackAuth,
      includeFallbackTokens,
    });

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      newValues: {
        provider: 'pi',
        feature: 'auth',
        route: '/api/auth/pi/login',
        requestId: ctx.requestId,
        traceId: ctx.traceId,
        correlationId: ctx.correlationId,
        sessionId: ctx.sessionId,
        ipAddress: ctx.ipAddress,
      },
    });

    return response;
  } catch (error) {
    logger.error('Pi login failed', error);
    return NextResponse.json<AuthResponse>(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 },
    );
  }
}