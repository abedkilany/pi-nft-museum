const PI_AUTH_TOKEN_KEY = 'pi_auth_token';

export function getPiAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PI_AUTH_TOKEN_KEY);
}

export function setPiAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PI_AUTH_TOKEN_KEY, token);
}

export function clearPiAuthToken() {
  if (typeof window === 'undefined') return;
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
    credentials: 'include',
  });
}
