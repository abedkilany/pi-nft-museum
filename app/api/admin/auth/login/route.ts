import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { issueAdminSessionToken, getAdminSessionCookieOptions } from '@/lib/admin-session';
import { isAdminRole } from '@/lib/roles';
import { assertSameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => null) as { identifier?: string; password?: string } | null;
  const identifier = String(body?.identifier || '').trim();
  const password = String(body?.password || '');

  if (!identifier || !password) {
    return NextResponse.json({ ok: false, error: 'Username/email and password are required.' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: 'insensitive' } },
        { username: { equals: identifier, mode: 'insensitive' } },
      ],
    },
    include: { role: true },
  });

  if (!user || !user.passwordHash || !isAdminRole(user.role.key)) {
    return NextResponse.json({ ok: false, error: 'Invalid admin credentials.' }, { status: 401 });
  }

  if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
    return NextResponse.json({ ok: false, error: 'This account is not allowed to sign in.' }, { status: 403 });
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ ok: false, error: 'Invalid admin credentials.' }, { status: 401 });
  }

  const session = await issueAdminSessionToken({
    userId: user.id,
    role: user.role.key,
    sessionVersion: user.sessionVersion,
    roleVersion: user.roleVersion,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => null);

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.key,
    },
  });

  response.cookies.set({
    ...getAdminSessionCookieOptions(session.expiresInSeconds),
    value: session.token,
  });

  return response;
}
