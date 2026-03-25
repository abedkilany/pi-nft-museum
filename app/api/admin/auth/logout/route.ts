import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { resolveAdminSessionFromCookieHeader, getAdminSessionCookieOptions } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const session = await resolveAdminSessionFromCookieHeader(request.headers.get('cookie'));
  if (session?.sessionUser?.userId) {
    await prisma.user.update({
      where: { id: session.sessionUser.userId },
      data: { sessionVersion: { increment: 1 } },
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...getAdminSessionCookieOptions(0),
    value: '',
    maxAge: 0,
  });
  return response;
}
