const PI_AUTH_TOKEN_KEY = 'pi_access_token';
const PI_SESSION_COOKIE_NAME = 'pi_session_hint';

function isBrowser() {
  return typeof window !== 'undefined';
}

function getStorage() {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
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
  return getStorage()?.getItem(PI_AUTH_TOKEN_KEY) || null;
}

export function syncPiAuthCookie(token?: string | null) {
  if (!token) {
    deleteClientCookie(PI_SESSION_COOKIE_NAME);
    return;
  }

  // Non-HttpOnly fallback for stubborn WebViews such as Pi Browser.
  // The authoritative server session is still the signed cookie set by the backend.
  writeClientCookie(PI_SESSION_COOKIE_NAME, token);
}

export function clearPiAuthCookie() {
  deleteClientCookie(PI_SESSION_COOKIE_NAME);
}

export function setPiAuthToken(token: string) {
  getStorage()?.setItem(PI_AUTH_TOKEN_KEY, token);
  syncPiAuthCookie(token);
}

export function clearPiAuthToken() {
  getStorage()?.removeItem(PI_AUTH_TOKEN_KEY);
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
