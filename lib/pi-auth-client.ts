const APP_SESSION_TOKEN_KEY = 'pi_app_session_token';
const APP_SESSION_COOKIE_NAME = 'pi_app_session';

let memoryToken: string | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getSessionStorageSafe() {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getCookieToken() {
  if (!isBrowser()) return null;
  try {
    const parts = document.cookie.split(';').map((part) => part.trim());
    const prefix = `${APP_SESSION_COOKIE_NAME}=`;
    const match = parts.find((part) => part.startsWith(prefix));
    if (!match) return null;
    return decodeURIComponent(match.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

function setCookieToken(token: string) {
  if (!isBrowser()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${APP_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

function clearCookieToken() {
  if (!isBrowser()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${APP_SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getPiAuthToken() {
  if (memoryToken) return memoryToken;

  const storage = getSessionStorageSafe();
  const stored = storage?.getItem(APP_SESSION_TOKEN_KEY) || null;
  if (stored) {
    memoryToken = stored;
    return stored;
  }

  const cookieToken = getCookieToken();
  if (cookieToken) {
    memoryToken = cookieToken;
    storage?.setItem(APP_SESSION_TOKEN_KEY, cookieToken);
    return cookieToken;
  }

  return null;
}

export function setPiAuthToken(token: string) {
  memoryToken = token;
  const storage = getSessionStorageSafe();
  storage?.setItem(APP_SESSION_TOKEN_KEY, token);
  setCookieToken(token);
}

export function clearPiAuthToken() {
  memoryToken = null;
  const storage = getSessionStorageSafe();
  storage?.removeItem(APP_SESSION_TOKEN_KEY);
  clearCookieToken();
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
    cache: init.cache ?? 'no-store',
    credentials: init.credentials ?? 'same-origin',
  });
}
