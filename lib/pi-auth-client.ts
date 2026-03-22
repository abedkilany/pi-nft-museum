const PI_AUTH_TOKEN_KEY = 'pi_access_token';

function getSessionStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getPiAuthToken() {
  return getSessionStorage()?.getItem(PI_AUTH_TOKEN_KEY) || null;
}

export function setPiAuthToken(token: string) {
  getSessionStorage()?.setItem(PI_AUTH_TOKEN_KEY, token);
}

export function clearPiAuthToken() {
  getSessionStorage()?.removeItem(PI_AUTH_TOKEN_KEY);
}

export function getPiAuthHeaders(init?: HeadersInit): HeadersInit {
  const token = getPiAuthToken();
  return {
    'X-Requested-With': 'XMLHttpRequest',
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
