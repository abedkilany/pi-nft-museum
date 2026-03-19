const PI_AUTH_STATE_KEY = 'pi_auth_state';

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
  return getStorage()?.getItem(PI_AUTH_STATE_KEY) || null;
}

export function syncPiAuthCookie(_token?: string | null) {
  return;
}

export function clearPiAuthCookie() {
  return;
}

export function setPiAuthToken(_token: string) {
  getStorage()?.setItem(PI_AUTH_STATE_KEY, '1');
}

export function clearPiAuthToken() {
  getStorage()?.removeItem(PI_AUTH_STATE_KEY);
}

export function getPiAuthHeaders(init?: HeadersInit): HeadersInit {
  return {
    ...(init || {}),
  };
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'include',
  });
}
