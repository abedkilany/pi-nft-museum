import type { NextRequest, NextResponse } from 'next/server';
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

const AUTH_COOKIE_NAME = 'pi_nft_auth';

function isSecureRequest(request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const origin = request.headers.get('origin');

  if (forwardedProto === 'https') return true;
  if (request.url.startsWith('https://')) return true;
  if (origin?.startsWith('https://')) return true;

  return process.env.NODE_ENV === 'production';
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getAuthCookieOptions(request: Request) {
  const secure = isSecureRequest(request);

  return {
    httpOnly: true,
    sameSite: 'none' as const,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export function setAuthCookies(
  response: NextResponse,
  request: Request,
  token: string
) {
  response.cookies.set(
    AUTH_COOKIE_NAME,
    token,
    getAuthCookieOptions(request)
  );
}

export function clearAuthCookies(response: NextResponse, request: Request) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  });
}

export function readAuthTokenFromCookieStore(
  cookieStore: Pick<RequestCookies, 'get'> | NextRequest['cookies']
) {
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}