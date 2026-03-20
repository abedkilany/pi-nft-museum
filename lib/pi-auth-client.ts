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

  // Non-HttpOnly fallback for stubborn WebViews such as Pi Browser.
  // The authoritative server session is still the signed cookie set by the backend.
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

function isRelativeApiRequest(input: RequestInfo | URL) {
  if (typeof input === 'string') return input.startsWith('/api/');
  if (input instanceof URL) return input.pathname.startsWith('/api/');
  return false;
}

async function tryRehydrateSession() {
  const authResponse = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (authResponse?.ok) return true;

  const bootstrapResponse = await fetch('/api/auth/bootstrap?returnTo=/', {
    method: 'GET',
    credentials: 'include',
    redirect: 'follow',
    cache: 'no-store',
  }).catch(() => null);

  return Boolean(bootstrapResponse?.ok);
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const execute = () => fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'include',
  });

  let response = await execute();

  if (response.status !== 401 || !isBrowser() || !isRelativeApiRequest(input)) {
    return response;
  }

  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname : '';
  if (requestUrl.startsWith('/api/auth/')) {
    return response;
  }

  const rehydrated = await tryRehydrateSession();
  if (!rehydrated) {
    return response;
  }

  response = await execute();
  return response;
}
