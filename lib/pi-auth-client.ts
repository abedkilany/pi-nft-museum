import { buildObservabilityHeaders } from '@/lib/observability-client';

const AUTH_MODE_STORAGE_KEY = 'pi_auth_mode';
const SESSION_TOKEN_STORAGE_KEY = 'pi_session_token';
const REFRESH_TOKEN_STORAGE_KEY = 'pi_refresh_token';

export type PiClientAuthMode = 'cookie' | 'hybrid' | 'fallback';

type MemoryAuthState = {
  mode: string | null;
  sessionToken: string | null;
  refreshToken: string | null;
};

const memoryAuthState: MemoryAuthState = {
  mode: null,
  sessionToken: null,
  refreshToken: null,
};

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

function readTokenWithMemoryFallback(key: string, memoryValue: string | null) {
  const stored = readStorage(key);
  return stored || memoryValue;
}

function writeTokenWithMemoryFallback(key: string, value: string, assignMemory: (value: string) => void) {
  assignMemory(value);
  writeStorage(key, value);
}

function clearTokenWithMemoryFallback(key: string, clearMemory: () => void) {
  clearMemory();
  removeStorage(key);
}

function normalizeAuthMode(value?: string | null): PiClientAuthMode {
  if (value === 'fallback' || value === 'fallback-session' || value === 'fallback-only') {
    return 'fallback';
  }

  if (
    value === 'hybrid' ||
    value === 'hybrid-session' ||
    value === 'hybrid-cookie-session-with-session-storage-fallback'
  ) {
    return 'hybrid';
  }

  return 'cookie';
}

export function getStoredPiSessionToken() {
  return readTokenWithMemoryFallback(SESSION_TOKEN_STORAGE_KEY, memoryAuthState.sessionToken);
}

export function getStoredPiRefreshToken() {
  return readTokenWithMemoryFallback(REFRESH_TOKEN_STORAGE_KEY, memoryAuthState.refreshToken);
}

export function getStoredAuthMode(): PiClientAuthMode {
  return normalizeAuthMode(readTokenWithMemoryFallback(AUTH_MODE_STORAGE_KEY, memoryAuthState.mode));
}

export function shouldUseBearerFallbackClient() {
  return getStoredAuthMode() === 'fallback' && Boolean(getStoredPiSessionToken());
}

export function getPiAuthToken() {
  return getStoredPiSessionToken() || 'cookie-session';
}

export function setPiAuthToken(token: string) {
  writeTokenWithMemoryFallback(SESSION_TOKEN_STORAGE_KEY, token, (value) => {
    memoryAuthState.sessionToken = value;
  });
}

export function setStoredAuthMode(mode: PiClientAuthMode) {
  const normalized = normalizeAuthMode(mode);
  writeTokenWithMemoryFallback(AUTH_MODE_STORAGE_KEY, normalized, (value) => {
    memoryAuthState.mode = value;
  });
}

export function storePiBrowserAuth(input: { sessionToken?: string | null; refreshToken?: string | null; mode?: string | null }) {
  if (input.mode) {
    setStoredAuthMode(normalizeAuthMode(input.mode));
  }

  if (typeof input.sessionToken === 'string' && input.sessionToken.length > 0) {
    writeTokenWithMemoryFallback(SESSION_TOKEN_STORAGE_KEY, input.sessionToken, (value) => {
      memoryAuthState.sessionToken = value;
    });
  }

  if (typeof input.refreshToken === 'string' && input.refreshToken.length > 0) {
    writeTokenWithMemoryFallback(REFRESH_TOKEN_STORAGE_KEY, input.refreshToken, (value) => {
      memoryAuthState.refreshToken = value;
    });
  }
}

export function clearPiAuthToken() {
  clearTokenWithMemoryFallback(AUTH_MODE_STORAGE_KEY, () => {
    memoryAuthState.mode = null;
  });
  clearTokenWithMemoryFallback(SESSION_TOKEN_STORAGE_KEY, () => {
    memoryAuthState.sessionToken = null;
  });
  clearTokenWithMemoryFallback(REFRESH_TOKEN_STORAGE_KEY, () => {
    memoryAuthState.refreshToken = null;
  });
}

export function getPiAuthHeaders(init?: HeadersInit, options?: { forceBearer?: boolean; includeRefreshHeader?: boolean }): Headers {
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');

  const authMode = getStoredAuthMode();
  headers.set('X-Auth-Mode', authMode);

  if (authMode !== 'cookie') {
    headers.set('X-Auth-Fallback-Allowed', '1');
  }

  const shouldAttachBearer = options?.forceBearer || authMode === 'fallback';
  const sessionToken = getStoredPiSessionToken();
  if (shouldAttachBearer && sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  if (options?.includeRefreshHeader) {
    const refreshToken = getStoredPiRefreshToken();
    if (refreshToken) {
      headers.set('X-Refresh-Token', refreshToken);
    }
  }

  return headers;
}

async function attemptRefresh() {
  const currentMode = getStoredAuthMode();
  const hasStoredRefreshToken = Boolean(getStoredPiRefreshToken());
  const shouldIncludeRefreshHeader = currentMode === 'fallback' || hasStoredRefreshToken;

  const headers = getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }), {
    forceBearer: currentMode === 'fallback',
    includeRefreshHeader: shouldIncludeRefreshHeader,
  });

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (!response) return false;

  const payload = await response.json().catch(() => null);
  if (response.ok) {
    const nextMode: PiClientAuthMode = currentMode === 'fallback'
      ? 'fallback'
      : hasStoredRefreshToken
        ? 'fallback'
        : payload?.fallback?.enabled
          ? 'hybrid'
          : 'cookie';

    storePiBrowserAuth({
      mode: nextMode,
      sessionToken: payload?.fallback?.sessionToken || null,
      refreshToken: payload?.fallback?.refreshToken || null,
    });
    return true;
  }

  const failureReason = typeof payload?.reason === 'string' ? payload.reason : null;
  const shouldClear =
    response.status === 401 &&
    (failureReason === 'INVALID_OR_EXPIRED_REFRESH_SESSION' ||
      failureReason === 'MALFORMED_AUTHORIZATION_HEADER' ||
      currentMode === 'fallback');

  if (shouldClear) {
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
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers), {
      forceBearer: getStoredAuthMode() === 'fallback',
    }),
    credentials: 'include' as const,
    cache: init.cache ?? 'no-store',
  };

  let response = await fetch(input, requestInit);

  if (response.status === 401 && !isAuthMaintenanceEndpoint(input)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      response = await fetch(input, {
        ...requestInit,
        headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers), {
          forceBearer: getStoredAuthMode() === 'fallback',
        }),
      });
    }
  }

  return response;
}
