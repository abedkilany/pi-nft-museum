import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';
import { getAuthCookieName } from '@/lib/auth-cookie';
import { PI_SESSION_HINT_COOKIE_NAME } from '@/lib/pi-auth-client';
import { resolvePiSessionFromToken } from '@/lib/pi-session';

function buildSecureCookieBase(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';

  return {
    secure: isSecure,
    sameSite: 'none' as const,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export async function GET(request: NextRequest) {
  const returnToParam = request.nextUrl.searchParams.get('returnTo') || '/';
  const returnTo = returnToParam.startsWith('/') ? returnToParam : '/';
  const hintToken = request.cookies.get(PI_SESSION_HINT_COOKIE_NAME)?.value;

  if (!hintToken) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const session = await resolvePiSessionFromToken(hintToken).catch(() => null);
  const response = NextResponse.redirect(new URL(returnTo, request.url));

  if (!session) {
    response.cookies.set({
      name: PI_SESSION_HINT_COOKIE_NAME,
      value: '',
      httpOnly: false,
      ...buildSecureCookieBase(request),
      maxAge: 0,
    });
    return response;
  }

  const sessionToken = await createSessionToken(session.sessionUser);
  response.cookies.set({
    name: getAuthCookieName(),
    value: sessionToken,
    httpOnly: true,
    ...buildSecureCookieBase(request),
  });
  response.cookies.set({
    name: PI_SESSION_HINT_COOKIE_NAME,
    value: hintToken,
    httpOnly: false,
    ...buildSecureCookieBase(request),
  });
  return response;
}
