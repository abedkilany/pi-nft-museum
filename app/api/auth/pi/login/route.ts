import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { setAuthCookies } from '@/lib/auth-cookie';
import { logger } from '@/lib/logger';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiRole
} from '@/lib/pi-auth';
import { applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    logger.info('PI_LOGIN_START', {
      requestId,
      method: request.method,
      url: request.url,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      userAgent: request.headers.get('user-agent'),
    });

    const rateLimitError = applyRateLimit(request, ['pi-login'], 'auth-pi-login', [
      { limit: 10, windowMs: 10 * 60 * 1000 },
      { limit: 40, windowMs: 60 * 60 * 1000 },
    ]);

    if (rateLimitError) {
      logger.warn('PI_LOGIN_RATE_LIMITED', {
        requestId,
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent'),
      });
      return rateLimitError;
    }

    const body = await request.json();
    const accessToken = String(body.accessToken || '').trim();

    logger.info('PI_LOGIN_REQUEST_RECEIVED', {
      requestId,
      hasAccessToken: !!accessToken,
      accessTokenLength: accessToken.length,
      accessTokenPreview: accessToken ? `${accessToken.slice(0, 6)}...` : null,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      forwardedHost: request.headers.get('x-forwarded-host'),
    });

    if (!accessToken) {
      logger.warn('PI_LOGIN_MISSING_ACCESS_TOKEN', {
        requestId,
      });
      return NextResponse.json({ error: 'Pi access token is required.' }, { status: 400 });
    }

    const piUser = await fetchPiUser(accessToken);

    logger.info('PI_LOGIN_FETCH_PI_USER_RESULT', {
      requestId,
      hasPiUser: !!piUser,
      piUid: piUser?.uid ?? null,
      piUsername: piUser?.username ?? null,
      hasWalletAddress: !!piUser?.wallet_address,
    });

    if (!piUser?.uid) {
      logger.warn('PI_LOGIN_INVALID_PI_USER', {
        requestId,
        piUid: piUser?.uid ?? null,
        piUsername: piUser?.username ?? null,
      });
      return NextResponse.json({ error: 'Pi did not return a valid user id.' }, { status: 401 });
    }

    logger.info('PI_LOGIN_VERIFIED', {
      requestId,
      piUid: piUser.uid,
      piUsername: piUser.username || null
    });

    const roleKey = await resolvePiRole(piUser);

    logger.info('PI_LOGIN_ROLE_RESOLVED', {
      requestId,
      piUid: piUser.uid,
      roleKey,
    });

    const role = await prisma.role.findUnique({ where: { key: roleKey } });

    if (!role) {
      logger.error('PI_LOGIN_ROLE_NOT_FOUND', {
        requestId,
        roleKey,
      });
      return NextResponse.json({ error: `Role "${roleKey}" is not configured in the database.` }, { status: 500 });
    }

    const usernameSource = piUser.username || `pi-user-${piUser.uid.slice(0, 8)}`;
    const syntheticEmail = buildSyntheticEmail(piUser.uid);

    let user = await prisma.user.findUnique({
      where: { piUid: piUser.uid },
      include: { role: true }
    });

    logger.info('PI_LOGIN_LOOKUP_BY_PIUID', {
      requestId,
      found: !!user,
      userId: user?.id ?? null,
      role: user?.role?.key ?? null,
    });

    if (!user && piUser.username) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { piUsername: piUser.username },
            { username: piUser.username }
          ]
        },
        include: { role: true }
      });

      logger.info('PI_LOGIN_LOOKUP_BY_USERNAME', {
        requestId,
        found: !!user,
        userId: user?.id ?? null,
        searchedUsername: piUser.username,
      });
    }

    if (!user) {
      const username = await ensureUniqueUsername(usernameSource);

      logger.info('PI_LOGIN_CREATE_USER_PREPARED', {
        requestId,
        username,
        roleId: role.id,
        roleKey: role.key,
      });

      user = await prisma.user.create({
        data: {
          username,
          fullName: piUser.username || username,
          email: syntheticEmail,
          passwordHash: null,
          roleId: role.id,
          status: 'ACTIVE',
          piUid: piUser.uid,
          piUsername: piUser.username || username,
          piWalletAddress: piUser.wallet_address || null,
          piLinkedAt: new Date(),
          piAuthVerified: true,
          lastLoginAt: new Date(),
        },
        include: { role: true }
      });

      logger.info('PI_LOGIN_USER_CREATED', {
        requestId,
        userId: user.id,
        role: role.key,
        piUid: piUser.uid,
        piUsername: piUser.username || null
      });
    } else {
      const username = await ensureUniqueUsername(piUser.username || user.username, user.id);

      logger.info('PI_LOGIN_UPDATE_USER_PREPARED', {
        requestId,
        userId: user.id,
        username,
        currentRole: user.role.key,
        currentStatus: user.status,
      });

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          fullName: user.fullName || piUser.username || username,
          email: user.email || syntheticEmail,
          status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
          piUid: piUser.uid,
          piUsername: piUser.username || user.piUsername || username,
          piWalletAddress: piUser.walletAddress || user.piWalletAddress || null,
          piLinkedAt: user.piLinkedAt || new Date(),
          piAuthVerified: true,
          lastLoginAt: new Date(),
        },
        include: { role: true }
      });

      logger.info('PI_LOGIN_USER_UPDATED', {
        requestId,
        userId: user.id,
        role: user.role.key,
        status: user.status,
        piUid: user.piUid,
        piUsername: user.piUsername || null
      });
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        targetType: 'USER',
        targetId: user.id,
        newValues: { status: user.status },
      });

      logger.warn('PI_LOGIN_BLOCKED_BY_STATUS', {
        requestId,
        userId: user.id,
        status: user.status,
      });

      return NextResponse.json({ error: 'Your account is not allowed to sign in right now.' }, { status: 403 });
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role.key,
      piUid: user.piUid,
      piUsername: user.piUsername
    });

    logger.info('PI_LOGIN_SESSION_TOKEN_CREATED', {
      requestId,
      userId: user.id,
      tokenLength: token.length,
      tokenPreview: `${token.slice(0, 12)}...`,
      role: user.role.key,
    });

    const response = NextResponse.json({
      ok: true,
      message: 'Connected with Pi.',
      user: {
        username: user.username,
        role: user.role.key,
        piUsername: user.piUsername
      }
    });

    setAuthCookies(response, request, token);

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      newValues: { role: user.role.key, piUid: user.piUid },
    });

    logger.info('PI_LOGIN_SET_COOKIE_ATTEMPT', {
      requestId,
      userId: user.id,
      cookieName: 'pi_nft_auth',
      secureCookie:
        request.headers.get('x-forwarded-proto') === 'https' ||
        request.url.startsWith('https://') ||
        (request.headers.get('origin') || '').startsWith('https://'),
      expectedPath: '/',
    });

    logger.info('PI_LOGIN_RESPONSE_READY', {
      requestId,
      userId: user.id,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error('PI_LOGIN_FAILED', {
      requestId,
      message: error instanceof Error ? error.message : 'Unknown server error',
      stack: error instanceof Error ? error.stack : null,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}