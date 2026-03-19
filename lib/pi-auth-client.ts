const PI_AUTH_TOKEN_KEY = 'pi_access_token';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorage() {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return window.localStorage;
  }
}

export function getPiAuthToken() {
  return getStorage()?.getItem(PI_AUTH_TOKEN_KEY) || null;
}

export function syncPiAuthCookie(_token?: string | null) {
  return;
}

export function clearPiAuthCookie() {
  return;
}

export function setPiAuthToken(token: string) {
  getStorage()?.setItem(PI_AUTH_TOKEN_KEY, token);
}

export function clearPiAuthToken() {
  getStorage()?.removeItem(PI_AUTH_TOKEN_KEY);
}

export function getPiAuthHeaders(init?: HeadersInit): HeadersInit {
  const token = getPiAuthToken();
  return {
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'omit',
  });
}
