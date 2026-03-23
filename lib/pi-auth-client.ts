const APP_SESSION_TOKEN_KEY = 'pi_app_session_token';

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

export function getPiAuthToken() {
  if (memoryToken) return memoryToken;
  const storage = getSessionStorageSafe();
  const stored = storage?.getItem(APP_SESSION_TOKEN_KEY) || null;
  if (stored) memoryToken = stored;
  return stored;
}

export function setPiAuthToken(token: string) {
  memoryToken = token;
  const storage = getSessionStorageSafe();
  storage?.setItem(APP_SESSION_TOKEN_KEY, token);
}

export function clearPiAuthToken() {
  memoryToken = null;
  const storage = getSessionStorageSafe();
  storage?.removeItem(APP_SESSION_TOKEN_KEY);
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
  });
}
