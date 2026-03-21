import { authenticateWithPi } from '@/lib/pi';

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

function isRelativeApiRequest(input: RequestInfo | URL) {
  if (typeof input === 'string') return input.startsWith('/api/');
  if (input instanceof URL) return input.pathname.startsWith('/api/');
  return false;
}

export async function ensurePiUserSession(scopes: string[] = ['username', 'payments']) {
  if (!isBrowser()) return null;

  const existingToken = getPiAuthToken();
  if (existingToken) {
    const existingResponse = await fetch('/api/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${existingToken}` },
      cache: 'no-store',
    }).catch(() => null);

    const existingPayload = existingResponse ? await existingResponse.json().catch(() => null) : null;
    if (existingResponse?.ok && existingPayload?.authenticated) {
      return existingPayload;
    }
  }

  const auth = await authenticateWithPi(scopes);
  const accessToken = String(auth?.accessToken || '').trim();
  if (!accessToken) {
    throw new Error('Pi login did not return an access token.');
  }

  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ accessToken }),
  });

  const loginPayload = await loginResponse.json().catch(() => null);
  if (!loginResponse.ok || !loginPayload?.ok) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  setPiAuthToken(accessToken);

  const authResponse = await fetch('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }).catch(() => null);
  const authPayload = authResponse ? await authResponse.json().catch(() => null) : null;

  if (!authResponse?.ok || !authPayload?.authenticated) {
    throw new Error(authPayload?.error || 'Pi session could not be verified.');
  }

  return authPayload;
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const execute = () => fetch(input, {
    ...init,
    headers: getPiAuthHeaders(init.headers),
    credentials: 'omit',
  });

  let response = await execute();

  if (response.status !== 401 || !isBrowser() || !isRelativeApiRequest(input)) {
    return response;
  }

  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname : '';
  if (requestUrl.startsWith('/api/auth/')) {
    return response;
  }

  const token = getPiAuthToken();
  if (!token) {
    return response;
  }

  const authResponse = await fetch('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);

  const authPayload = authResponse ? await authResponse.json().catch(() => null) : null;
  if (!authResponse?.ok || !authPayload?.authenticated) {
    clearPiAuthToken();
    return response;
  }

  response = await execute();
  return response;
}
