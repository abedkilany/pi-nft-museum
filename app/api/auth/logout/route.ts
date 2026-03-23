import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_BRIDGE_COOKIE } from '@/lib/admin-bridge';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const token = extractBearerToken(request.headers.get('authorization'));
  if (token) {
    const session = await resolvePiSessionFromToken(token).catch(() => null);
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { sessionVersion: { increment: 1 } },
      }).catch(() => null);
    }
  }

  const response = NextResponse.json({ success: true, authMode: 'short-lived-app-session' });
  response.cookies.set({
    name: ADMIN_SESSION_BRIDGE_COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/admin',
    maxAge: 0,
  });

  return response;
}
