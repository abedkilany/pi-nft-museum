import type { NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'pi_nft_auth';
const AUTH_COOKIE_FALLBACK_NAME = 'pi_nft_auth_client';

function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = request.headers.get('origin');

  if (forwardedProto === 'https') return true;
  if (request.url.startsWith('https://')) return true;
  if (origin?.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

export function getFallbackAuthCookieName() {
  return AUTH_COOKIE_FALLBACK_NAME;
}

export function getAuthCookieOptions(request: Request) {
  const secure = isSecureRequest(request);

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function setAuthCookies(response: NextResponse, request: Request, token: string) {
  const options = getAuthCookieOptions(request);
  response.cookies.set(AUTH_COOKIE_NAME, token, options);
  response.cookies.set(AUTH_COOKIE_FALLBACK_NAME, token, {
    ...options,
    httpOnly: false,
  });
}

export function clearAuthCookies(response: NextResponse, request: Request) {
  const options = getAuthCookieOptions(request);

  response.cookies.set(AUTH_COOKIE_NAME, '', { ...options, maxAge: 0 });
  response.cookies.set(AUTH_COOKIE_FALLBACK_NAME, '', { ...options, httpOnly: false, maxAge: 0 });

  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...options,
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });
  response.cookies.set(AUTH_COOKIE_FALLBACK_NAME, '', {
    ...options,
    httpOnly: false,
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });
}
