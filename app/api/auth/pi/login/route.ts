import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiRole
} from '@/lib/pi-auth';
import { applyRateLimit, assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { issueAppSessionToken } from '@/lib/app-session';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  try {
    const rateLimitError = applyRateLimit(request, ['pi-login'], 'auth-pi-login', [
      { limit: 10, windowMs: 10 * 60 * 1000 },
      { limit: 40, windowMs: 60 * 60 * 1000 },
    ]);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const accessToken = String(body.accessToken || '').trim();

    logger.info('Pi login request received', {
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

    if (!piUser?.uid) {
      return NextResponse.json({ error: 'Pi did not return a valid user id.' }, { status: 401 });
    }

    const resolvedRoleKey = await resolvePiRole(piUser);
    const resolvedRole = await prisma.role.findUnique({ where: { key: resolvedRoleKey } });

    if (!resolvedRole) {
      return NextResponse.json({ error: `Role "${resolvedRoleKey}" is not configured in the database.` }, { status: 500 });
    }

    const usernameSource = piUser.username || `pi-user-${piUser.uid.slice(0, 8)}`;
    const syntheticEmail = buildSyntheticEmail(piUser.uid);

    let user = await prisma.user.findUnique({
      where: { piUid: piUser.uid },
      include: { role: true }
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
    }

    if (!user) {
      const username = await ensureUniqueUsername(usernameSource);
      user = await prisma.user.create({
        data: {
          username,
          fullName: piUser.username || username,
          email: syntheticEmail,
          passwordHash: null,
          roleId: resolvedRole.id,
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
    } else {
      const username = await ensureUniqueUsername(piUser.username || user.username, user.id);

      const currentRoleKey = user.role?.key || 'artist_or_trader';
      const rolePriority: Record<string, number> = {
        artist_or_trader: 1,
        moderator: 2,
        admin: 3,
        superadmin: 4,
      };

      const shouldPromoteFromEnv =
        (rolePriority[resolvedRole.key] || 0) > (rolePriority[currentRoleKey] || 0);

      const targetRoleId = shouldPromoteFromEnv ? resolvedRole.id : user.roleId;
      const targetRoleKey = shouldPromoteFromEnv ? resolvedRole.key : currentRoleKey;
      const roleChanged = user.roleId !== targetRoleId;

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          fullName: user.fullName || piUser.username || username,
          email: user.email || syntheticEmail,
          status: user.status === 'PENDING' ? 'ACTIVE' : user.status,
          roleId: targetRoleId,
          roleVersion: roleChanged ? { increment: 1 } : undefined,
          piUid: piUser.uid,
          piUsername: piUser.username || user.piUsername || username,
          piWalletAddress: piUser.wallet_address || user.piWalletAddress || null,
          piLinkedAt: user.piLinkedAt || new Date(),
          piAuthVerified: true,
          lastLoginAt: new Date(),
        },
        include: { role: true }
      });

      if (currentRoleKey !== targetRoleKey) {
        logger.info('Pi login preserved or promoted existing role', {
          userId: user.id,
          previousRole: currentRoleKey,
          resolvedRole: resolvedRole.key,
          appliedRole: targetRoleKey,
          promotedFromEnv: shouldPromoteFromEnv,
        });
      }
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      await createAuditLog({
        userId: user.id,
        action: 'LOGIN_BLOCKED',
        targetType: 'USER',
        targetId: user.id,
        newValues: { status: user.status },
      });
      return NextResponse.json({ error: 'Your account is not allowed to sign in right now.' }, { status: 403 });
    }

    const session = await issueAppSessionToken({
      userId: user.id,
      role: user.role.key,
      piUid: user.piUid,
      piUsername: user.piUsername,
      sessionVersion: user.sessionVersion,
      roleVersion: user.roleVersion,
    });

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      newValues: { role: user.role.key, piUid: user.piUid, authMode: 'short-lived-app-session' },
    });

    const response = NextResponse.json({
      ok: true,
      message: 'Connected with Pi.',
      authMode: 'short-lived-app-session',
      session: {
        token: session.token,
        expiresInSeconds: session.expiresInSeconds,
        expiresAt: session.expiresAt,
      },
      user: {
        id: user.id,
        username: user.username,
        role: user.role.key,
        piUsername: user.piUsername,
      },
    });

    response.cookies.set('pi_app_session', session.token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: session.expiresInSeconds,
    });

    return response;
  } catch (error) {
    logger.error('Pi login failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}
