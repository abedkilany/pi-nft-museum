import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSessionToken, getAuthCookieName } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  buildSyntheticEmail,
  ensureUniqueUsername,
  fetchPiUser,
  resolvePiRole
} from '@/lib/pi-auth';

function isSecureRequest(request: Request) {
  const origin = request.headers.get('origin') || '';
  const forwardedProto = request.headers.get('x-forwarded-proto') || '';
  return origin.startsWith('https://') || forwardedProto === 'https';
}

export async function POST(request: Request) {
  try {
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

      logger.info('Pi user logged in', {
        userId: user.id,
        role: user.role.key,
        piUid: piUser.uid,
        piUsername: user.piUsername || null
      });
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
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

    const secureCookie = isSecureRequest(request);
    const sameSite = secureCookie ? 'none' : 'lax';

    const response = NextResponse.json({
      ok: true,
      message: 'Connected with Pi.',
      user: {
        username: user.username,
        role: user.role.key,
        piUsername: user.piUsername
      }
    });

    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite,
      secure: secureCookie,
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    logger.info('Pi session cookie prepared', {
      userId: user.id,
      secureCookie,
      sameSite,
      origin: request.headers.get('origin'),
      forwardedProto: request.headers.get('x-forwarded-proto') || null
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
