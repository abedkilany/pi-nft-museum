import type { NextRequest, NextResponse } from 'next/server';
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

const AUTH_COOKIE_NAME = 'pi_nft_auth';
const AUTH_COOKIE_CROSS_SITE_NAME = '__Secure-pi_nft_auth_cross';

function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = request.headers.get('origin');

  if (forwardedProto === 'https') return true;
  if (request.url.startsWith('https://')) return true;
  if (origin?.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

export function getCrossSiteAuthCookieName() {
  return AUTH_COOKIE_CROSS_SITE_NAME;
}

export function getAuthCookieOptions(request: Request) {
  const secure = isSecureRequest(request);

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

function getCrossSiteCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'none' as const,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export function setAuthCookies(response: NextResponse, request: Request, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions(request));
  response.cookies.set(AUTH_COOKIE_CROSS_SITE_NAME, token, getCrossSiteCookieOptions());
}

function clearCookiePair(response: NextResponse, name: string, request: Request, httpOnly: boolean) {
  const options = getAuthCookieOptions(request);

  response.cookies.set(name, '', {
    ...options,
    httpOnly,
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(name, '', {
    ...options,
    httpOnly,
    sameSite: 'none',
    secure: true,
    maxAge: 0,
    expires: new Date(0),
  });
}

export function clearAuthCookies(response: NextResponse, request: Request) {
  clearCookiePair(response, AUTH_COOKIE_NAME, request, true);
  clearCookiePair(response, AUTH_COOKIE_CROSS_SITE_NAME, request, true);
}

export function readAuthTokenFromCookieStore(cookieStore: Pick<RequestCookies, 'get'> | NextRequest['cookies']) {
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || cookieStore.get(AUTH_COOKIE_CROSS_SITE_NAME)?.value || null;
}
