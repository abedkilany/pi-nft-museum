import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiRole
} from '@/lib/pi-auth';
import { applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { createSessionToken } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { setAuthCookies } from '@/lib/auth-cookie';


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
      forwardedHost: request.headers.get('x-forwarded-host')
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'Pi access token is required.' }, { status: 400 });
    }

    const piUser = await fetchPiUser(accessToken);

    if (!piUser?.uid) {
      return NextResponse.json({ error: 'Pi did not return a valid user id.' }, { status: 401 });
    }

    logger.info('Pi user verified', {
      piUid: piUser.uid,
      piUsername: piUser.username || null
    });

    const roleKey = await resolvePiRole(piUser);
    const role = await prisma.role.findUnique({ where: { key: roleKey } });

    if (!role) {
      return NextResponse.json({ error: `Role "${roleKey}" is not configured in the database.` }, { status: 500 });
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

      logger.info('Pi user account created', {
        userId: user.id,
        role: role.key,
        piUid: piUser.uid,
        piUsername: piUser.username || null
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
        include: { role: true }
      });

      logger.info('Pi user record updated for sign-in', {
        userId: user.id,
        role: user.role.key,
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
      return NextResponse.json({ error: 'Your account is not allowed to sign in right now.' }, { status: 403 });
    }

    const sessionToken = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role.key,
      piUid: user.piUid,
      piUsername: user.piUsername,
    });

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      newValues: { role: user.role.key, piUid: user.piUid },
    });

    const response = NextResponse.json({
      ok: true,
      message: 'Connected with Pi.',
      user: {
        id: user.id,
        username: user.username,
        role: user.role.key,
        piUsername: user.piUsername,
      },
    });

    setAuthCookies(response, request, sessionToken);
    return response;
  } catch (error) {
    logger.error('Pi login failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}