const PI_AUTH_TOKEN_KEY = 'pi_access_token';

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

export function getPiAuthToken() {
  for (const storage of getStorages()) {
    const token = storage.getItem(PI_AUTH_TOKEN_KEY);
    if (token) return token;
  }

  return null;
}

export function setPiAuthToken(token: string) {
  for (const storage of getStorages()) {
    storage.setItem(PI_AUTH_TOKEN_KEY, token);
  }
}

export function clearPiAuthToken() {
  for (const storage of getStorages()) {
    storage.removeItem(PI_AUTH_TOKEN_KEY);
  }
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
