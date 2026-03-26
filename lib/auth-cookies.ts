import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isIosUserAgent, isPiBrowserUserAgent } from '@/lib/pi-browser-auth';

export const APP_SESSION_COOKIE = 'pi_app_session';
export const REFRESH_SESSION_COOKIE = 'pi_refresh_session';
export const ADMIN_BRIDGE_COOKIE = 'pi_admin_bridge';

const SESSION_MAX_AGE_SECONDS = 10 * 60;
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_BRIDGE_MAX_AGE_SECONDS = 5 * 60;
const REFRESH_COOKIE_PATH = '/api/auth';
const ADMIN_BRIDGE_COOKIE_PATH = '/admin';

type CookieSameSite = 'none' | 'lax';

function isSecureCookie(request?: Request | NextRequest | null) {
  const forwardedProto = request?.headers?.get('x-forwarded-proto');
  if (forwardedProto) return forwardedProto === 'https';

  try {
    return new URL(request?.url || '').protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

function shouldAllowCrossSiteSessionCookies(request?: Request | NextRequest | null) {
  const userAgent = request?.headers?.get('user-agent') || '';
  if (!isSecureCookie(request)) return false;
  if (!isPiBrowserUserAgent(userAgent)) return false;
  if (isIosUserAgent(userAgent)) return false;
  return true;
}

function resolveSessionSameSite(request?: Request | NextRequest | null): CookieSameSite {
  return shouldAllowCrossSiteSessionCookies(request) ? 'none' : 'lax';
}

function resolveAdminBridgeSameSite(_request?: Request | NextRequest | null): CookieSameSite {
  return 'lax';
}

export function describeCookiePolicy(request?: Request | NextRequest | null) {
  const secure = isSecureCookie(request);
  const sessionSameSite = resolveSessionSameSite(request);
  const adminBridgeSameSite = resolveAdminBridgeSameSite(request);

  return {
    secure,
    sameSite: sessionSameSite,
    path: '/',
    sessionMaxAge: SESSION_MAX_AGE_SECONDS,
    refreshMaxAge: REFRESH_MAX_AGE_SECONDS,
    adminBridgeMaxAge: ADMIN_BRIDGE_MAX_AGE_SECONDS,
    sessionCookie: {
      secure,
      sameSite: sessionSameSite,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
    refreshCookie: {
      secure,
      sameSite: sessionSameSite,
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_MAX_AGE_SECONDS,
    },
    adminBridgeCookie: {
      secure,
      sameSite: adminBridgeSameSite,
      path: ADMIN_BRIDGE_COOKIE_PATH,
      maxAge: ADMIN_BRIDGE_MAX_AGE_SECONDS,
    },
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
  const policy = describeCookiePolicy(request);

  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: values.sessionToken,
    httpOnly: true,
    secure: policy.sessionCookie.secure,
    sameSite: policy.sessionCookie.sameSite,
    path: policy.sessionCookie.path,
    maxAge: policy.sessionCookie.maxAge,
  });

  response.cookies.set({
    name: REFRESH_SESSION_COOKIE,
    value: values.refreshToken,
    httpOnly: true,
    secure: policy.refreshCookie.secure,
    sameSite: policy.refreshCookie.sameSite,
    path: policy.refreshCookie.path,
    maxAge: policy.refreshCookie.maxAge,
  });
}

export function clearSessionCookies(response: NextResponse, request?: Request | NextRequest | null) {
  const policy = describeCookiePolicy(request);

  response.cookies.set({
    name: APP_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: policy.sessionCookie.secure,
    sameSite: policy.sessionCookie.sameSite,
    path: policy.sessionCookie.path,
    maxAge: 0,
  });

  response.cookies.set({
    name: REFRESH_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: policy.refreshCookie.secure,
    sameSite: policy.refreshCookie.sameSite,
    path: policy.refreshCookie.path,
    maxAge: 0,
  });
}

export function setAdminBridgeCookie(
  response: NextResponse,
  token: string,
  request?: Request | NextRequest | null,
) {
  const policy = describeCookiePolicy(request);

  response.cookies.set({
    name: ADMIN_BRIDGE_COOKIE,
    value: token,
    httpOnly: true,
    secure: policy.adminBridgeCookie.secure,
    sameSite: policy.adminBridgeCookie.sameSite,
    path: policy.adminBridgeCookie.path,
    maxAge: policy.adminBridgeCookie.maxAge,
  });
}

export function clearAdminBridgeCookie(response: NextResponse, request?: Request | NextRequest | null) {
  const policy = describeCookiePolicy(request);

  response.cookies.set({
    name: ADMIN_BRIDGE_COOKIE,
    value: '',
    httpOnly: true,
    secure: policy.adminBridgeCookie.secure,
    sameSite: policy.adminBridgeCookie.sameSite,
    path: policy.adminBridgeCookie.path,
    maxAge: 0,
  });
}
