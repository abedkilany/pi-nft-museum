import { buildObservabilityHeaders } from '@/lib/observability-client';
import { shouldPreferPiBrowserBearerFallback } from '@/lib/pi-browser-auth';

const APP_SESSION_STORAGE_KEY = 'pi_auth_session_token';
const REFRESH_SESSION_STORAGE_KEY = 'pi_auth_refresh_token';
const AUTH_MODE_STORAGE_KEY = 'pi_auth_mode';

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
  return readStorage(APP_SESSION_STORAGE_KEY);
}

export function getStoredPiRefreshToken() {
  return readStorage(REFRESH_SESSION_STORAGE_KEY);
}

export function getStoredAuthMode() {
  return readStorage(AUTH_MODE_STORAGE_KEY);
}

export function shouldUseBearerFallbackClient() {
  const authMode = getStoredAuthMode();
  if (authMode === 'pi-browser-bearer-fallback') return true;
  if (authMode === 'cookie-session') return false;
  return shouldPreferPiBrowserBearerFallback();
}

export function getPiAuthToken() {
  return getStoredPiSessionToken() || 'cookie-session';
}

export function setPiAuthToken(token: string) {
  if (!token || token === 'cookie-session') return;
  writeStorage(APP_SESSION_STORAGE_KEY, token);
}

export function storePiBrowserAuth(input: { sessionToken?: string | null; refreshToken?: string | null; mode?: string | null }) {
  if (input.mode === 'cookie-session' && !input.sessionToken && !input.refreshToken) {
    removeStorage(APP_SESSION_STORAGE_KEY);
    removeStorage(REFRESH_SESSION_STORAGE_KEY);
  }

  if (input.sessionToken) writeStorage(APP_SESSION_STORAGE_KEY, input.sessionToken);
  if (input.refreshToken) writeStorage(REFRESH_SESSION_STORAGE_KEY, input.refreshToken);
  if (input.mode) writeStorage(AUTH_MODE_STORAGE_KEY, input.mode);
}

export function clearPiAuthToken() {
  removeStorage(APP_SESSION_STORAGE_KEY);
  removeStorage(REFRESH_SESSION_STORAGE_KEY);
  removeStorage(AUTH_MODE_STORAGE_KEY);
}

export function getPiAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');

  const bearerToken = getStoredPiSessionToken();
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }

  const refreshToken = getStoredPiRefreshToken();
  if (refreshToken) {
    headers.set('X-Refresh-Token', refreshToken);
  }

  const authMode = getStoredAuthMode();
  if (authMode) {
    headers.set('X-Auth-Mode', authMode);
  }

  return headers;
}

async function attemptRefresh() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' })),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (!response) return false;

  const payload = await response.json().catch(() => null);
  if (response.ok) {
    const nextSessionToken = payload?.session?.token;
    const nextRefreshToken = payload?.session?.refreshToken;
    if (nextSessionToken || nextRefreshToken) {
      storePiBrowserAuth({
        sessionToken: typeof nextSessionToken === 'string' ? nextSessionToken : null,
        refreshToken: typeof nextRefreshToken === 'string' ? nextRefreshToken : null,
        mode: typeof payload?.session?.transport === 'string' ? payload.session.transport : getStoredAuthMode(),
      });
    }
    return true;
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
