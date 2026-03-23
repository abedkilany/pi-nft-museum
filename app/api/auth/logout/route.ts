import { NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/security';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';
import { prisma } from '@/lib/prisma';

const APP_SESSION_COOKIE_NAME = 'pi_app_session';

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const cookieToken = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${APP_SESSION_COOKIE_NAME}=`))
    ?.slice(`${APP_SESSION_COOKIE_NAME}=`.length);

  const token = extractBearerToken(request.headers.get('authorization')) || cookieToken;
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
  response.cookies.set(APP_SESSION_COOKIE_NAME, '', {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
