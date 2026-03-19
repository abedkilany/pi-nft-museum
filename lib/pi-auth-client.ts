const PI_AUTH_TOKEN_KEY = 'pi_auth_token';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getPiAuthToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(PI_AUTH_TOKEN_KEY);
}

export function syncPiAuthCookie(_token?: string | null) {
  return;
}

export function clearPiAuthCookie() {
  return;
}

export function setPiAuthToken(token: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PI_AUTH_TOKEN_KEY, token);
}

export function clearPiAuthToken() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PI_AUTH_TOKEN_KEY);
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
