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
  const checkAuth = async () => fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  const authResponse = await checkAuth();
  if (authResponse?.ok) return true;

  await fetch('/api/auth/bootstrap?returnTo=/', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    credentials: 'include',
    redirect: 'follow',
    cache: 'no-store',
  }).catch(() => null);

  const postBootstrapAuthResponse = await checkAuth();
  return Boolean(postBootstrapAuthResponse?.ok);
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


type PiSessionUser = {
  id?: number;
  username?: string | null;
  email?: string | null;
  role?: string | null;
  piUid?: string | null;
  piUsername?: string | null;
};

type EnsurePiSessionResult = {
  ok: boolean;
  authenticated: boolean;
  user?: PiSessionUser | null;
  reason?: string;
};

async function readJsonSafe<T = any>(response: Response | null): Promise<T | null> {
  if (!response) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function loginWithPiAccessToken(accessToken: string): Promise<EnsurePiSessionResult> {
  const response = await piApiFetch('/api/auth/pi/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ accessToken }),
  }).catch(() => null);

  const payload = await readJsonSafe<any>(response);

  if (!response?.ok || payload?.ok !== true) {
    return {
      ok: false,
      authenticated: false,
      reason: payload?.error || payload?.message || 'PI_LOGIN_FAILED',
    };
  }

  setPiAuthToken(accessToken);

  const authResponse = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);
  const authPayload = await readJsonSafe<any>(authResponse);

  if (!authResponse?.ok || authPayload?.authenticated !== true) {
    return {
      ok: false,
      authenticated: false,
      reason: authPayload?.reason || 'AUTH_CONFIRMATION_FAILED',
    };
  }

  return {
    ok: true,
    authenticated: true,
    user: authPayload?.user || payload?.user || null,
  };
}

export async function ensurePiUserSession(): Promise<EnsurePiSessionResult> {
  const authResponse = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);
  const authPayload = await readJsonSafe<any>(authResponse);

  if (authResponse?.ok && authPayload?.authenticated === true) {
    return {
      ok: true,
      authenticated: true,
      user: authPayload?.user || null,
    };
  }

  const bootstrapRehydrated = await tryRehydrateSession();
  if (bootstrapRehydrated) {
    const recheckResponse = await fetch('/api/auth/me', {
      method: 'GET',
      headers: getPiAuthHeaders(),
      credentials: 'include',
      cache: 'no-store',
    }).catch(() => null);
    const recheckPayload = await readJsonSafe<any>(recheckResponse);

    if (recheckResponse?.ok && recheckPayload?.authenticated === true) {
      return {
        ok: true,
        authenticated: true,
        user: recheckPayload?.user || null,
      };
    }
  }

  try {
    const mod = await import('./pi');
    const auth = await mod.authenticateWithPi(['username', 'payments']);
    const accessToken = auth?.accessToken?.trim();

    if (!accessToken) {
      return {
        ok: false,
        authenticated: false,
        reason: 'PI_ACCESS_TOKEN_MISSING',
      };
    }

    return await loginWithPiAccessToken(accessToken);
  } catch (error) {
    return {
      ok: false,
      authenticated: false,
      reason: error instanceof Error ? error.message : 'PI_AUTHENTICATION_FAILED',
    };
  }
}
