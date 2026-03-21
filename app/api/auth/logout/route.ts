import { NextResponse } from 'next/server';
import { getAuthCookieName } from '@/lib/auth';
import { PI_SESSION_HINT_COOKIE_NAME } from '@/lib/pi-auth-client';
import { assertSameOrigin } from '@/lib/security';

function buildSecureCookieBase(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';

  return {
    secure: isSecure,
    sameSite: 'none' as const,
    path: '/',
  };
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: getAuthCookieName(),
    value: '',
    httpOnly: true,
    ...buildSecureCookieBase(request),
    maxAge: 0,
  });

  response.cookies.set({
    name: PI_SESSION_HINT_COOKIE_NAME,
    value: '',
    httpOnly: false,
    ...buildSecureCookieBase(request),
    maxAge: 0,
  });

  return response;
}