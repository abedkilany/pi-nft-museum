import { buildObservabilityHeaders } from '@/lib/observability-client';

const AUTH_MODE_STORAGE_KEY = 'pi_auth_mode';
const SESSION_TOKEN_STORAGE_KEY = 'pi_session_token';
const REFRESH_TOKEN_STORAGE_KEY = 'pi_refresh_token';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readStorage(key: string) {
  if (!canUseSessionStorage()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

function removeStorage(key: string) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

export function getStoredPiSessionToken() {
  return readStorage(SESSION_TOKEN_STORAGE_KEY);
}

export function getStoredPiRefreshToken() {
  return readStorage(REFRESH_TOKEN_STORAGE_KEY);
}

export function getStoredAuthMode() {
  return readStorage(AUTH_MODE_STORAGE_KEY);
}

export function shouldUseBearerFallbackClient() {
  return Boolean(getStoredPiSessionToken());
}

export function getPiAuthToken() {
  return getStoredPiSessionToken() || 'cookie-session';
}

export function setPiAuthToken(token: string) {
  writeStorage(SESSION_TOKEN_STORAGE_KEY, token);
}

export function storePiBrowserAuth(input: { sessionToken?: string | null; refreshToken?: string | null; mode?: string | null }) {
  if (input.mode) writeStorage(AUTH_MODE_STORAGE_KEY, input.mode);

  if (typeof input.sessionToken === 'string' && input.sessionToken.length > 0) {
    writeStorage(SESSION_TOKEN_STORAGE_KEY, input.sessionToken);
  }

  if (typeof input.refreshToken === 'string' && input.refreshToken.length > 0) {
    writeStorage(REFRESH_TOKEN_STORAGE_KEY, input.refreshToken);
  }
}

export function clearPiAuthToken() {
  removeStorage(AUTH_MODE_STORAGE_KEY);
  removeStorage(SESSION_TOKEN_STORAGE_KEY);
  removeStorage(REFRESH_TOKEN_STORAGE_KEY);
}

export function getPiAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');

  const authMode = getStoredAuthMode();
  if (authMode) {
    headers.set('X-Auth-Mode', authMode);
  }

  headers.set('X-Auth-Fallback-Allowed', '1');

  const sessionToken = getStoredPiSessionToken();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  return headers;
}

async function attemptRefresh() {
  const headers = getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }));
  const refreshToken = getStoredPiRefreshToken();

  if (refreshToken) {
    headers.set('X-Refresh-Token', refreshToken);
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (!response) return false;

  const payload = await response.json().catch(() => null);
  if (response.ok) {
    storePiBrowserAuth({
      mode: payload?.fallback?.enabled ? 'hybrid-session' : payload?.authMode || 'cookie-session',
      sessionToken: payload?.fallback?.sessionToken || null,
      refreshToken: payload?.fallback?.refreshToken || null,
    });
    return true;
  }

  if (response.status === 401) {
    clearPiAuthToken();
  }

  return false;
}

function isAuthMaintenanceEndpoint(input: RequestInfo | URL) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return raw.includes('/api/auth/refresh') || raw.includes('/api/auth/logout');
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestInit = {
    ...init,
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
    credentials: 'include' as const,
    cache: init.cache ?? 'no-store',
  };

  let response = await fetch(input, requestInit);

  if (response.status === 401 && !isAuthMaintenanceEndpoint(input)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      response = await fetch(input, {
        ...requestInit,
        headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
      });
    }
  }

  return response;
}
