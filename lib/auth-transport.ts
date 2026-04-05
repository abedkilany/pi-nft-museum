export const AUTH_TRANSPORT_COOKIE = 'cookie-session';
export const AUTH_TRANSPORT_BEARER_FALLBACK = 'pi-browser-bearer-fallback';
export const AUTH_TRANSPORT_ADMIN_BRIDGE = 'admin-bridge';

export type AppAuthTransport =
  | typeof AUTH_TRANSPORT_COOKIE
  | typeof AUTH_TRANSPORT_BEARER_FALLBACK
  | typeof AUTH_TRANSPORT_ADMIN_BRIDGE;

export function getUserAgent(source?: string | null) {
  if (typeof source === 'string') return source;
  if (typeof navigator !== 'undefined') return navigator.userAgent || '';
  return '';
}

export function isPiBrowserUserAgent(source?: string | null) {
  const userAgent = getUserAgent(source).toLowerCase();
  return userAgent.includes('pibrowser') || userAgent.includes(' pi browser') || userAgent.includes('minepi');
}

export function isIosUserAgent(source?: string | null) {
  const userAgent = getUserAgent(source).toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

export function shouldPreferPiBrowserBearerFallback(source?: string | null) {
  const userAgent = getUserAgent(source);
  return isPiBrowserUserAgent(userAgent) && isIosUserAgent(userAgent);
}

export function normalizeRequestedAuthMode(source?: string | null) {
  const value = typeof source === 'string' ? source.trim().toLowerCase() : '';
  if (!value) return null;
  if (value === AUTH_TRANSPORT_COOKIE || value === 'cookie') return AUTH_TRANSPORT_COOKIE;
  if (value === AUTH_TRANSPORT_BEARER_FALLBACK || value === 'fallback') return AUTH_TRANSPORT_BEARER_FALLBACK;
  if (value === AUTH_TRANSPORT_ADMIN_BRIDGE) return AUTH_TRANSPORT_ADMIN_BRIDGE;
  return null;
}

export function isAdminPath(pathname?: string | null) {
  if (!pathname) return false;
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export function isBearerFallbackAllowedForPath(pathname?: string | null) {
  return !isAdminPath(pathname);
}

export function resolveRequestedAuthTransport(options?: {
  pathname?: string | null;
  requestedAuthMode?: string | null;
  userAgent?: string | null;
  allowBearerFallback?: boolean;
}) {
  const allowBearerFallback = options?.allowBearerFallback ?? isBearerFallbackAllowedForPath(options?.pathname);
  const requestedAuthMode = normalizeRequestedAuthMode(options?.requestedAuthMode);
  const prefersFallbackByUserAgent = shouldPreferPiBrowserBearerFallback(options?.userAgent);

  if (allowBearerFallback && (requestedAuthMode === AUTH_TRANSPORT_BEARER_FALLBACK || prefersFallbackByUserAgent)) {
    return AUTH_TRANSPORT_BEARER_FALLBACK;
  }

  return AUTH_TRANSPORT_COOKIE;
}
