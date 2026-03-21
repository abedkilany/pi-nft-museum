const PI_AUTH_TOKEN_KEY = 'pi_access_token';
export const PI_SESSION_HINT_COOKIE_NAME = 'pi_session_hint';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorages() {
  if (!isBrowser()) return [];

  const storages: Storage[] = [];

  try {
    storages.push(window.sessionStorage);
  } catch {}

  try {
    storages.push(window.localStorage);
  } catch {}

  return storages;
}

function isSecureContextForCookie() {
  if (!isBrowser()) return false;
  return window.location.protocol === 'https:';
}

function writeClientCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 12) {
  if (!isBrowser()) return;

  const encoded = encodeURIComponent(value);
  const parts = [
    `${name}=${encoded}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=None',
  ];

  if (isSecureContextForCookie()) {
    parts.push('Secure');
  }

  document.cookie = parts.join('; ');
}

function deleteClientCookie(name: string) {
  if (!isBrowser()) return;

  const parts = [
    `${name}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=None',
  ];

  if (isSecureContextForCookie()) {
    parts.push('Secure');
  }

  document.cookie = parts.join('; ');
}

export function getPiAuthToken() {
  for (const storage of getStorages()) {
    const token = storage.getItem(PI_AUTH_TOKEN_KEY);
    if (token) return token;
  }

  return null;
}

export function syncPiAuthCookie(token?: string | null) {
  if (!token) {
    deleteClientCookie(PI_SESSION_HINT_COOKIE_NAME);
    return;
  }

  writeClientCookie(PI_SESSION_HINT_COOKIE_NAME, token);
}

export function clearPiAuthCookie() {
  deleteClientCookie(PI_SESSION_HINT_COOKIE_NAME);
}

export function setPiAuthToken(token: string) {
  for (const storage of getStorages()) {
    storage.setItem(PI_AUTH_TOKEN_KEY, token);
  }

  syncPiAuthCookie(token);
}

export function clearPiAuthToken() {
  for (const storage of getStorages()) {
    storage.removeItem(PI_AUTH_TOKEN_KEY);
  }

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
  return fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'include',
  });
}
