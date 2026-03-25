import { buildObservabilityHeaders, consumeOrCreateTraceId } from '@/lib/observability-client';

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

type AuthDiagMeta = Record<string, unknown>;

function canUseWindowFetch() {
  return typeof window !== 'undefined' && typeof fetch !== 'undefined';
}

async function pushAuthClientDiag(event: string, meta?: AuthDiagMeta, level: 'info' | 'warn' = 'info') {
  if (!canUseWindowFetch()) return;
  try {
    const traceId = consumeOrCreateTraceId();
    await fetch('/api/auth/pi/debug', {
      method: 'POST',
      headers: buildObservabilityHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
      }, traceId),
      body: JSON.stringify({ event, level, meta: { ...(meta || {}), traceId } }),
      cache: 'no-store',
      keepalive: true,
    });
  } catch {}
}

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
  if (value === 'fallback' || value === 'fallback-session' || value === 'fallback-only' || value === 'token' || value === 'token-first') {
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

export function getClientAuthDiagnosticState() {
  const storedMode = readStorage(AUTH_MODE_STORAGE_KEY);
  const storedSessionToken = readStorage(SESSION_TOKEN_STORAGE_KEY);
  const storedRefreshToken = readStorage(REFRESH_TOKEN_STORAGE_KEY);

  return {
    authMode: normalizeAuthMode(storedMode || memoryAuthState.mode),
    hasStoredMode: Boolean(storedMode),
    hasMemoryMode: Boolean(memoryAuthState.mode),
    hasStoredSessionToken: Boolean(storedSessionToken),
    hasMemorySessionToken: Boolean(memoryAuthState.sessionToken),
    hasStoredRefreshToken: Boolean(storedRefreshToken),
    hasMemoryRefreshToken: Boolean(memoryAuthState.refreshToken),
    sessionStorageAvailable: canUseSessionStorage(),
  };
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
  return getStoredAuthMode() !== 'cookie' && Boolean(getStoredPiSessionToken());
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

  void pushAuthClientDiag('PI_AUTH_CLIENT_STORE_BROWSER_AUTH', {
    requestedMode: input.mode || null,
    hasInputSessionToken: Boolean(input.sessionToken),
    hasInputRefreshToken: Boolean(input.refreshToken),
    state: getClientAuthDiagnosticState(),
  });
}

export function clearPiAuthToken(reason?: string) {
  const before = getClientAuthDiagnosticState();
  clearTokenWithMemoryFallback(AUTH_MODE_STORAGE_KEY, () => {
    memoryAuthState.mode = null;
  });
  clearTokenWithMemoryFallback(SESSION_TOKEN_STORAGE_KEY, () => {
    memoryAuthState.sessionToken = null;
  });
  clearTokenWithMemoryFallback(REFRESH_TOKEN_STORAGE_KEY, () => {
    memoryAuthState.refreshToken = null;
  });
  void pushAuthClientDiag('PI_AUTH_CLIENT_CLEAR_TOKENS', {
    reason: reason || null,
    before,
    after: getClientAuthDiagnosticState(),
  }, 'warn');
}

export function getPiAuthHeaders(init?: HeadersInit, options?: { forceBearer?: boolean; includeRefreshHeader?: boolean }): Headers {
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');

  const authMode = getStoredAuthMode();
  headers.set('X-Auth-Mode', authMode);

  const sessionToken = getStoredPiSessionToken();
  const shouldAttachBearer = Boolean(sessionToken) && (options?.forceBearer || authMode !== 'cookie');
  if (shouldAttachBearer && sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
    headers.set('X-Auth-Fallback-Allowed', '1');
  }

  const refreshToken = getStoredPiRefreshToken();
  if ((options?.includeRefreshHeader || authMode !== 'cookie') && refreshToken) {
    headers.set('X-Refresh-Token', refreshToken);
    headers.set('X-Auth-Fallback-Allowed', '1');
  }

  return headers;
}

async function attemptRefresh() {
  const currentMode = getStoredAuthMode();
  const hasStoredRefreshToken = Boolean(getStoredPiRefreshToken());
  const shouldIncludeRefreshHeader = hasStoredRefreshToken;

  void pushAuthClientDiag('PI_AUTH_CLIENT_REFRESH_START', {
    currentMode,
    hasStoredRefreshToken,
    shouldIncludeRefreshHeader,
    state: getClientAuthDiagnosticState(),
  });

  const headers = getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }), {
    forceBearer: currentMode !== 'cookie',
    includeRefreshHeader: shouldIncludeRefreshHeader,
  });

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    void pushAuthClientDiag('PI_AUTH_CLIENT_REFRESH_NETWORK_FAILURE', {
      currentMode,
      state: getClientAuthDiagnosticState(),
    }, 'warn');
    return false;
  }

  const payload = await response.json().catch(() => null);
  void pushAuthClientDiag('PI_AUTH_CLIENT_REFRESH_RESPONSE', {
    currentMode,
    status: response.status,
    ok: response.ok,
    sentAuthorization: headers.has('Authorization'),
    sentRefreshHeader: headers.has('X-Refresh-Token'),
    payloadHasFallbackSessionToken: Boolean(payload?.fallback?.sessionToken),
    payloadHasFallbackRefreshToken: Boolean(payload?.fallback?.refreshToken),
    payloadFallbackEnabled: Boolean(payload?.fallback?.enabled),
    state: getClientAuthDiagnosticState(),
  }, response.ok ? 'info' : 'warn');

  if (response.ok) {
    const nextMode: PiClientAuthMode = payload?.fallback?.enabled || hasStoredRefreshToken || currentMode !== 'cookie'
      ? 'fallback'
      : 'cookie';

    storePiBrowserAuth({
      mode: nextMode,
      sessionToken: payload?.fallback?.sessionToken || getStoredPiSessionToken(),
      refreshToken: payload?.fallback?.refreshToken || getStoredPiRefreshToken(),
    });
    return true;
  }

  const failureReason = typeof payload?.reason === 'string' ? payload.reason : null;
  const shouldClear = response.status === 401 && (
    failureReason === 'INVALID_OR_EXPIRED_REFRESH_SESSION' ||
    failureReason === 'MALFORMED_AUTHORIZATION_HEADER' ||
    failureReason === 'NO_REFRESH_TOKEN'
  );

  if (shouldClear) {
    clearPiAuthToken('attemptRefresh_shouldClear');
  }

  return false;
}

function isAuthMaintenanceEndpoint(input: RequestInfo | URL) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return raw.includes('/api/auth/refresh') || raw.includes('/api/auth/logout');
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  const requestInit = {
    ...init,
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers), {
      forceBearer: getStoredAuthMode() !== 'cookie',
      includeRefreshHeader: requestUrl.includes('/api/auth/refresh') || requestUrl.includes('/api/auth/logout'),
    }),
    credentials: 'include' as const,
    cache: init.cache ?? 'no-store',
  };

  if (requestUrl.includes('/api/auth/')) {
    const headers = new Headers(requestInit.headers);
    void pushAuthClientDiag('PI_AUTH_CLIENT_FETCH_START', {
      requestUrl,
      method: requestInit.method || 'GET',
      authMode: getStoredAuthMode(),
      sentAuthorization: headers.has('Authorization'),
      sentRefreshHeader: headers.has('X-Refresh-Token'),
      fallbackAllowed: headers.get('X-Auth-Fallback-Allowed'),
      state: getClientAuthDiagnosticState(),
    });
  }

  let response = await fetch(input, requestInit);

  if (requestUrl.includes('/api/auth/')) {
    void pushAuthClientDiag('PI_AUTH_CLIENT_FETCH_RESPONSE', {
      requestUrl,
      method: requestInit.method || 'GET',
      status: response.status,
      ok: response.ok,
      authMode: getStoredAuthMode(),
      state: getClientAuthDiagnosticState(),
    }, response.ok ? 'info' : 'warn');
  }

  if (response.status === 401 && !isAuthMaintenanceEndpoint(input)) {
    if (requestUrl.includes('/api/auth/')) {
      void pushAuthClientDiag('PI_AUTH_CLIENT_FETCH_401_BEFORE_REFRESH', {
        requestUrl,
        method: requestInit.method || 'GET',
        authMode: getStoredAuthMode(),
        state: getClientAuthDiagnosticState(),
      }, 'warn');
    }
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retryHeaders = getPiAuthHeaders(buildObservabilityHeaders(init.headers), {
        forceBearer: getStoredAuthMode() !== 'cookie',
        includeRefreshHeader: requestUrl.includes('/api/auth/refresh') || requestUrl.includes('/api/auth/logout'),
      });
      if (requestUrl.includes('/api/auth/')) {
        const headers = new Headers(retryHeaders);
        void pushAuthClientDiag('PI_AUTH_CLIENT_FETCH_RETRY_AFTER_REFRESH', {
          requestUrl,
          method: requestInit.method || 'GET',
          authMode: getStoredAuthMode(),
          sentAuthorization: headers.has('Authorization'),
          sentRefreshHeader: headers.has('X-Refresh-Token'),
          state: getClientAuthDiagnosticState(),
        }, 'info');
      }
      response = await fetch(input, {
        ...requestInit,
        headers: retryHeaders,
      });
    }
  }

  return response;
}
