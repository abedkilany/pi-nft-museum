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
    ...(init || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function rehydrateServerSession() {
  const token = getPiAuthToken();
  if (!token) return false;

  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  return Boolean(response?.ok);
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const doFetch = () => fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'include',
  });

  let response = await doFetch();

  if (response.status !== 401) {
    return response;
  }

  const restored = await rehydrateServerSession();
  if (!restored) {
    return response;
  }

  response = await doFetch();
  return response;
}
