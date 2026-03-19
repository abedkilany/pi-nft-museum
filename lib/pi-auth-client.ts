const PI_AUTH_TOKEN_KEY = 'pi_auth_token';
const PI_AUTH_COOKIE_NAME = 'pi_nft_auth';
const PI_AUTH_COOKIE_MAX_AGE = 60 * 60 * 12;

function isBrowser() {
  return typeof window !== 'undefined';
}

function isSecureContextForCookie() {
  if (!isBrowser()) return false;
  return window.location.protocol === 'https:';
}

export function getPiAuthToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(PI_AUTH_TOKEN_KEY);
}

function buildCookieValue(token: string, maxAge = PI_AUTH_COOKIE_MAX_AGE) {
  const secure = isSecureContextForCookie() ? '; Secure' : '';
  return `${PI_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function syncPiAuthCookie(token?: string | null) {
  if (!isBrowser()) return;
  const effectiveToken = token ?? getPiAuthToken();
  if (!effectiveToken) return;
  document.cookie = buildCookieValue(effectiveToken);
}

export function clearPiAuthCookie() {
  if (!isBrowser()) return;
  const secure = isSecureContextForCookie() ? '; Secure' : '';
  document.cookie = `${PI_AUTH_COOKIE_NAME}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax${secure}`;
}

export function setPiAuthToken(token: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PI_AUTH_TOKEN_KEY, token);
  syncPiAuthCookie(token);
}

export function clearPiAuthToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PI_AUTH_TOKEN_KEY);
  clearPiAuthCookie();
}

export function getPiAuthHeaders(init?: HeadersInit): HeadersInit {
  const token = getPiAuthToken();

  return {
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getPiAuthToken();
  if (token) {
    syncPiAuthCookie(token);
  }

  return fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'include',
  });
}
