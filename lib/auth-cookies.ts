import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const APP_SESSION_COOKIE = 'pi_app_session';
export const REFRESH_SESSION_COOKIE = 'pi_refresh_session';
export const ADMIN_BRIDGE_COOKIE = 'pi_admin_bridge';

const SESSION_MAX_AGE_SECONDS = 10 * 60;
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_BRIDGE_MAX_AGE_SECONDS = 5 * 60;

function isSecureCookie(request?: Request | NextRequest | null) {
  const forwardedProto = request?.headers?.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto === 'https';

  try {
    return new URL(request?.url || '').protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

function resolveSameSite(secure: boolean): 'none' | 'lax' {
  // SameSite=None is required for cross-site / Pi Browser auth flows,
  // but browsers only accept it when Secure=true.
  return secure ? 'none' : 'lax';
}


export function describeCookiePolicy(request?: Request | NextRequest | null) {
  const secure = isSecureCookie(request);
  const sameSite = resolveSameSite(secure);
  return {
    secure,
    sameSite,
    path: '/',
    sessionMaxAge: SESSION_MAX_AGE_SECONDS,
    refreshMaxAge: REFRESH_MAX_AGE_SECONDS,
    adminBridgeMaxAge: ADMIN_BRIDGE_MAX_AGE_SECONDS,
  } as const;
}

export function getCookieValueFromHeader(cookieHeader: string | null | undefined, key: string) {
  if (!cookieHeader) return null;

  const entries = cookieHeader.split(';');
  for (const entry of entries) {
    const [rawName, ...rest] = entry.trim().split('=');
    if (rawName !== key) continue;
    return decodeURIComponent(rest.join('='));
  }

  return null;
}

export function getSessionCookieFromHeaders(headers: { get(name: string): string | null }) {
  return getCookieValueFromHeader(headers.get('cookie'), APP_SESSION_COOKIE);
}

export function getRefreshCookieFromHeaders(headers: { get(name: string): string | null }) {
  return getCookieValueFromHeader(headers.get('cookie'), REFRESH_SESSION_COOKIE);
}

export function getAdminBridgeCookieFromHeaders(headers: { get(name: string): string | null }) {
  return getCookieValueFromHeader(headers.get('cookie'), ADMIN_BRIDGE_COOKIE);
}

export function setSessionCookies(
  response: NextResponse,
  values: { sessionToken: string; refreshToken: string },
  request?: Request | NextRequest | null,
) {
  const secure = isSecureCookie(request);
  const sameSite = resolveSameSite(secure);

  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: values.sessionToken,
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  response.cookies.set({
    name: REFRESH_SESSION_COOKIE,
    value: values.refreshToken,
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookies(response: NextResponse, request?: Request | NextRequest | null) {
  const secure = isSecureCookie(request);
  const sameSite = resolveSameSite(secure);

  for (const name of [APP_SESSION_COOKIE, REFRESH_SESSION_COOKIE]) {
    response.cookies.set({
      name,
      value: '',
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 0,
    });
  }
}

export function setAdminBridgeCookie(
  response: NextResponse,
  token: string,
  request?: Request | NextRequest | null,
) {
  const secure = isSecureCookie(request);
  const sameSite = resolveSameSite(secure);

  response.cookies.set({
    name: ADMIN_BRIDGE_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: ADMIN_BRIDGE_MAX_AGE_SECONDS,
  });
}

export function clearAdminBridgeCookie(response: NextResponse, request?: Request | NextRequest | null) {
  const secure = isSecureCookie(request);
  const sameSite = resolveSameSite(secure);

  response.cookies.set({
    name: ADMIN_BRIDGE_COOKIE,
    value: '',
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
  });
}