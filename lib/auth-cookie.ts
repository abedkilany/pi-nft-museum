import type { NextRequest, NextResponse } from 'next/server';
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';

const AUTH_COOKIE_NAME = 'pi_nft_auth';
const LEGACY_COOKIE_NAMES = [
  '__Secure-pi_nft_auth_cross',
  '__Secure-pi_nft_auth_client_cross',
  'pi_nft_auth_client',
];

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
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

function expireCookie(response: NextResponse, name: string, request: Request, httpOnly = true) {
  const secure = isSecureRequest(request);

  response.cookies.set(name, '', {
    httpOnly,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(name, '', {
    httpOnly,
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

export function setAuthCookies(
  response: NextResponse,
  request: Request,
  token: string
) {
  for (const legacyName of LEGACY_COOKIE_NAMES) {
    expireCookie(response, legacyName, request, true);
    expireCookie(response, legacyName, request, false);
  }

  response.cookies.set(
    AUTH_COOKIE_NAME,
    token,
    getAuthCookieOptions(request)
  );
}

export function clearAuthCookies(response: NextResponse, request: Request) {
  expireCookie(response, AUTH_COOKIE_NAME, request, true);

  for (const legacyName of LEGACY_COOKIE_NAMES) {
    expireCookie(response, legacyName, request, true);
    expireCookie(response, legacyName, request, false);
  }
}

export function readAuthTokenFromCookieStore(
  cookieStore: Pick<RequestCookies, 'get'> | NextRequest['cookies']
) {
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}