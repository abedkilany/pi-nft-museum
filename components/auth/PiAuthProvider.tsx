'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authenticateWithPi } from '@/lib/pi';
import { clearPiAuthToken, getClientAuthDiagnosticState, getPiAuthHeaders, getStoredAuthMode, getStoredPiRefreshToken, getStoredPiSessionToken, piApiFetch, refreshPiBrowserSession, setStoredAuthMode, storePiBrowserAuth } from '@/lib/pi-auth-client';
import { shouldPreferPiBrowserBearerFallback } from '@/lib/pi-browser-auth';
import { beginClientTrace, buildObservabilityHeaders, consumeOrCreateTraceId, getClientSessionId } from '@/lib/observability-client';
import { isPiDebugEnabled } from '@/lib/debug-flags';

type AuthUser = {
  id: number;
  username: string;
  email?: string;
  role: string;
  permissions?: string[];
  adminPanelAccess?: boolean;
  piUid?: string | null;
  piUsername?: string | null;
};

type PiAuthContextValue = {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'guest';
  error: string;
  ensureAuthenticated: (traceId?: string | null) => Promise<AuthUser | null>;
  refreshUser: (traceId?: string | null) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const PiAuthContext = createContext<PiAuthContextValue | undefined>(undefined);

async function pushClientAuthDebug(
  event: string,
  meta?: Record<string, unknown>,
  level: 'info' | 'warn' = 'info',
  traceId?: string | null
) {
  if (!isPiDebugEnabled) return;

  try {
    const resolvedTraceId = consumeOrCreateTraceId(traceId);
    await fetch('/api/auth/pi/debug', {
      method: 'POST',
      headers: buildObservabilityHeaders(
        {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        },
        resolvedTraceId
      ),
      body: JSON.stringify({ event, level, meta: { ...(meta || {}), traceId: resolvedTraceId } }),
      cache: 'no-store',
    });
  } catch {}
}

type FetchCurrentUserResult =
  | { ok: true; user: AuthUser; source?: string | null }
  | { ok: false; reason: 'unauthorized' | 'network' | 'server' };

async function pushPostAuthEvent(
  name: string,
  traceId?: string | null,
  payload?: {
    status?: 'STARTED' | 'SUCCESS' | 'WARNING' | 'FAILED';
    message?: string | null;
    data?: Record<string, unknown> | null;
    errorName?: string | null;
    errorCode?: string | null;
  }
) {
  if (!isPiDebugEnabled) return;

  try {
    const resolvedTraceId = consumeOrCreateTraceId(traceId);
    await fetch('/api/events', {
      method: 'POST',
      headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, resolvedTraceId),
      body: JSON.stringify({
        category: 'SYSTEM_FLOW',
        type: 'AUTH_POST_LOGIN',
        name,
        eventKey: name,
        status: payload?.status || 'SUCCESS',
        source: 'CLIENT',
        feature: 'auth',
        route: window.location.pathname,
        url: window.location.href,
        sessionId: getClientSessionId(),
        traceId: resolvedTraceId,
        correlationId: resolvedTraceId,
        message: payload?.message || null,
        isHealthy: (payload?.status || 'SUCCESS') !== 'FAILED' && (payload?.status || 'SUCCESS') !== 'WARNING',
        errorName: payload?.errorName || null,
        errorCode: payload?.errorCode || null,
        data: payload?.data || null,
      }),
      cache: 'no-store',
      keepalive: true,
    }).catch(() => null);
  } catch {}
}

async function fetchCurrentUser(traceId?: string | null): Promise<FetchCurrentUserResult> {
  const resolvedTraceId = consumeOrCreateTraceId(traceId);
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  await pushClientAuthDebug('PI_AUTH_ME_REQUEST_START', {}, 'info', resolvedTraceId);
  await pushPostAuthEvent('POST_AUTH_FETCH_CURRENT_USER_START', resolvedTraceId, {
    status: 'STARTED',
    data: { endpoint: '/api/auth/me' }
  });

  const response = await piApiFetch('/api/auth/me', {
    method: 'GET',
    headers: buildObservabilityHeaders(undefined, resolvedTraceId),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    await pushClientAuthDebug('PI_AUTH_ME_REQUEST_NETWORK_FAILURE', {}, 'warn', resolvedTraceId);
    await pushPostAuthEvent('POST_AUTH_FETCH_CURRENT_USER_FAILED', resolvedTraceId, {
      status: 'FAILED',
      message: 'Failed to reach /api/auth/me',
      errorCode: 'AUTH_ME_NETWORK_FAILURE',
      data: { endpoint: '/api/auth/me' }
    });
    return { ok: false, reason: 'network' };
  }

  const payload = await response.json().catch(() => null);

  if (response.ok && payload?.authenticated && payload?.user) {
    await pushClientAuthDebug(
      'PI_AUTH_ME_REQUEST_SUCCESS',
      { userId: payload.user.id, role: payload.user.role },
      'info',
      resolvedTraceId
    );
    await pushPostAuthEvent('POST_AUTH_FETCH_CURRENT_USER_SUCCESS', resolvedTraceId, {
      data: {
        endpoint: '/api/auth/me',
        status: response.status,
        durationMs: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt),
        userId: payload.user.id,
        role: payload.user.role,
      }
    });
    return { ok: true, user: payload.user as AuthUser, source: typeof payload?.source === 'string' ? payload.source : null };
  }

  await pushClientAuthDebug(
    'PI_AUTH_ME_REQUEST_NON_SUCCESS',
    {
      status: response.status,
      authenticated: payload?.authenticated ?? null,
      reason: payload?.reason ?? null,
    },
    response.status === 401 ? 'info' : 'warn',
    resolvedTraceId
  );

  await pushPostAuthEvent('POST_AUTH_FETCH_CURRENT_USER_NON_SUCCESS', resolvedTraceId, {
    status: response.status === 401 ? 'WARNING' : 'FAILED',
    message: 'Non-success response from /api/auth/me',
    errorCode: response.status === 401 ? 'AUTH_ME_UNAUTHORIZED' : 'AUTH_ME_NON_SUCCESS',
    data: {
      endpoint: '/api/auth/me',
      status: response.status,
      authenticated: payload?.authenticated ?? null,
      reason: payload?.reason ?? null,
      durationMs: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt),
    }
  });

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: false, reason: 'server' };
}



async function syncServerPageSession(input: { includeAdminBridge?: boolean; traceId?: string | null } = {}) {
  const resolvedTraceId = consumeOrCreateTraceId(input.traceId);
  const response = await fetch('/api/auth/page-session', {
    method: 'POST',
    headers: getPiAuthHeaders(buildObservabilityHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-App-Request': 'pi-web',
    }, resolvedTraceId)),
    credentials: 'include',
    cache: 'no-store',
    body: JSON.stringify({ includeAdminBridge: Boolean(input.includeAdminBridge) }),
  }).catch(() => null);

  await pushClientAuthDebug('PI_AUTH_PAGE_SESSION_SYNC_RESULT', {
    ok: Boolean(response?.ok),
    status: response?.status ?? null,
    includeAdminBridge: Boolean(input.includeAdminBridge),
  }, response?.ok ? 'info' : 'warn', resolvedTraceId);

  return Boolean(response?.ok);
}

async function fetchSessionDebug(traceId?: string | null) {
  const resolvedTraceId = consumeOrCreateTraceId(traceId);
  const response = await fetch('/api/auth/session-debug', {
    method: 'GET',
    headers: buildObservabilityHeaders({ Accept: 'application/json' }, resolvedTraceId),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return { ok: false, reason: 'network' as const, payload: null };
  }

  const payload = await response.json().catch(() => null);
  return {
    ok: response.ok,
    reason: response.ok ? 'ok' as const : response.status === 404 ? 'not_available' as const : 'non_success' as const,
    payload,
    status: response.status,
  };
}

async function resolveUserAfterLogin(traceId?: string | null) {
  const resolvedTraceId = consumeOrCreateTraceId(traceId);
  const delays = [0, 350, 900];
  let forcedFallback = false;

  for (let index = 0; index < delays.length; index += 1) {
    const delayMs = delays[index];
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    let meResult = await fetchCurrentUser(resolvedTraceId);
    if (!meResult.ok && meResult.reason === 'unauthorized' && !forcedFallback && Boolean(getStoredPiSessionToken())) {
      const currentMode = getStoredAuthMode();
      if (currentMode !== 'fallback') {
        forcedFallback = true;
        setStoredAuthMode('fallback');
        await pushClientAuthDebug('PI_AUTH_SWITCHED_TO_FALLBACK_AFTER_ME_401', { attempt: index + 1, previousMode: currentMode, state: getClientAuthDiagnosticState() }, 'info', resolvedTraceId);
        meResult = await fetchCurrentUser(resolvedTraceId);
      }
    }

    if (meResult.ok) {
      if (meResult.source === 'bearer') {
        setStoredAuthMode('fallback');
      }
      if (index > 0 || forcedFallback) {
        await pushClientAuthDebug('PI_AUTH_SESSION_RESTORE_RECOVERED_AFTER_RETRY', { attempt: index + 1, delayMs, source: meResult.source ?? null, authMode: getStoredAuthMode() }, 'info', resolvedTraceId);
      }
      return { ok: true as const, user: meResult.user };
    }

    await pushClientAuthDebug('PI_AUTH_SESSION_RESTORE_RETRY_RESULT', { attempt: index + 1, delayMs, reason: meResult.reason, authMode: getStoredAuthMode(), forcedFallback }, meResult.reason === 'unauthorized' ? 'info' : 'warn', resolvedTraceId);
  }

  const sessionDebug = await fetchSessionDebug(resolvedTraceId);
  await pushClientAuthDebug(
    'PI_AUTH_SESSION_RESTORE_FAILED_AFTER_LOGIN',
    {
      debugStatus: sessionDebug.ok ? 200 : sessionDebug.status ?? null,
      debugReason: sessionDebug.reason,
      debug: sessionDebug.payload,
    },
    'warn',
    resolvedTraceId
  );

  const message = sessionDebug.payload?.error
    || (sessionDebug.reason === 'not_available'
      ? 'Pi login succeeded, but the session-debug route is not available in this deployment.'
      : 'Pi login succeeded on the server, but the cookie session could not be restored on the client.');

  return { ok: false as const, error: message };
}

async function authenticateAndResolveUser(traceId?: string | null) {
  const resolvedTraceId = beginClientTrace(traceId);
  await pushClientAuthDebug('PI_AUTH_SDK_START', {}, 'info', resolvedTraceId);

  const auth = await authenticateWithPi(['username', 'payments']);
  await pushClientAuthDebug(
    'PI_AUTH_SDK_SUCCESS',
    {
      hasAccessToken: Boolean(auth?.accessToken),
      piUid: auth?.user?.uid || null,
      piUsername: auth?.user?.username || null,
    },
    'info',
    resolvedTraceId
  );

  if (!auth?.accessToken) {
    throw new Error('Pi login did not return an access token.');
  }

  const prefersBearerFallback = shouldPreferPiBrowserBearerFallback();

  await pushClientAuthDebug('PI_AUTH_SERVER_LOGIN_START', { prefersBearerFallback }, 'info', resolvedTraceId);
  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: buildObservabilityHeaders(
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
        'X-Auth-Fallback-Allowed': '1',
        'X-Auth-Fallback-Preferred': '1',
      },
      resolvedTraceId
    ),
    body: JSON.stringify({ accessToken: auth.accessToken }),
    credentials: 'include',
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  await pushClientAuthDebug(
    'PI_AUTH_SERVER_LOGIN_RESPONSE',
    {
      ok: Boolean(loginResponse?.ok),
      status: loginResponse?.status ?? null,
      hasSessionCookie: Boolean(loginPayload?.session?.expiresAt),
      error: loginPayload?.error ?? null,
      code: loginPayload?.code ?? null,
      fallbackEnabled: Boolean(loginPayload?.fallback?.enabled),
      hasFallbackSessionToken: Boolean(loginPayload?.fallback?.sessionToken),
      hasFallbackRefreshToken: Boolean(loginPayload?.fallback?.refreshToken),
    },
    loginResponse?.ok ? 'info' : 'warn',
    resolvedTraceId
  );

  if (!loginResponse?.ok || !loginPayload?.ok) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  const initialAuthMode = loginPayload?.fallback?.enabled ? 'fallback' : 'cookie';

  storePiBrowserAuth({
    mode: initialAuthMode,
    sessionToken: loginPayload?.fallback?.sessionToken || null,
    refreshToken: loginPayload?.fallback?.refreshToken || null,
  });
  await pushClientAuthDebug('PI_AUTH_SESSION_STORAGE_SNAPSHOT_AFTER_LOGIN', {
    state: getClientAuthDiagnosticState(),
  }, 'info', resolvedTraceId);
  await pushClientAuthDebug('PI_AUTH_SESSION_TOKEN_STORED', {
    prefersBearerFallback,
    initialAuthMode,
    hasFallbackSessionToken: Boolean(loginPayload?.fallback?.sessionToken),
    hasFallbackRefreshToken: Boolean(loginPayload?.fallback?.refreshToken),
    transport: loginPayload?.fallback?.enabled ? 'hybrid-session' : 'cookie-session',
  }, 'info', resolvedTraceId);

  if (initialAuthMode === 'fallback' && loginPayload?.user) {
    await pushClientAuthDebug('PI_AUTH_TOKEN_FIRST_LOGIN_COMPLETED', {
      userId: loginPayload.user.id,
      role: loginPayload.user.role,
      authMode: initialAuthMode,
      state: getClientAuthDiagnosticState(),
    }, 'info', resolvedTraceId);

    void (async () => {
      const refreshed = await refreshPiBrowserSession();
      await pushClientAuthDebug('PI_AUTH_TOKEN_FIRST_POST_LOGIN_REFRESH_RESULT', {
        refreshed,
        state: getClientAuthDiagnosticState(),
      }, refreshed ? 'info' : 'warn', resolvedTraceId);
      if (refreshed) {
        await resolveUserAfterLogin(resolvedTraceId);
      }
    })();

    await syncServerPageSession({ includeAdminBridge: Boolean((loginPayload.user as AuthUser | undefined)?.adminPanelAccess), traceId: resolvedTraceId });
    return loginPayload.user as AuthUser;
  }

  const resolvedUser = await resolveUserAfterLogin(resolvedTraceId);
  if (resolvedUser.ok) {
    return resolvedUser.user;
  }

  throw new Error(resolvedUser.error);
}

export function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [error, setError] = useState('');
  const requestRef = useRef<Promise<AuthUser | null> | null>(null);

  const runAuthFlow = useCallback(async (forcePiAuth = false, traceId?: string | null) => {
    if (requestRef.current) return requestRef.current;

    requestRef.current = (async () => {
      const resolvedTraceId = consumeOrCreateTraceId(traceId);
      try {
        setError('');
        await pushClientAuthDebug('PI_AUTH_FLOW_START', { forcePiAuth }, 'info', resolvedTraceId);

        if (!forcePiAuth) {
          const prefersBearerFallback = shouldPreferPiBrowserBearerFallback();
          const hasSessionToken = Boolean(getStoredPiSessionToken());
          const hasRefreshToken = Boolean(getStoredPiRefreshToken());
          const currentMode = getStoredAuthMode();

          if (!hasSessionToken && !hasRefreshToken && currentMode === 'cookie') {
            await pushClientAuthDebug('PI_AUTH_FLOW_SKIP_RESTORE_WITHOUT_LOCAL_SESSION', { prefersBearerFallback }, 'info', resolvedTraceId);
            setUser(null);
            setStatus('guest');
            return null;
          }

          if (!hasSessionToken && hasRefreshToken && currentMode !== 'cookie') {
            const bootstrapped = await refreshPiBrowserSession();
            await pushClientAuthDebug('PI_AUTH_FLOW_BOOTSTRAP_FROM_REFRESH', { bootstrapped, state: getClientAuthDiagnosticState() }, bootstrapped ? 'info' : 'warn', resolvedTraceId);
          }

          let restored = await fetchCurrentUser(resolvedTraceId);
          if (!restored.ok && restored.reason === 'unauthorized' && getStoredAuthMode() !== 'cookie' && Boolean(getStoredPiSessionToken())) {
            const previousMode = getStoredAuthMode();
            setStoredAuthMode('fallback');
            await pushClientAuthDebug('PI_AUTH_FLOW_PROMOTED_TO_FALLBACK', { previousMode, state: getClientAuthDiagnosticState() }, 'info', resolvedTraceId);
            restored = await fetchCurrentUser(resolvedTraceId);
          }

          if (restored.ok) {
            await pushClientAuthDebug(
              'PI_AUTH_FLOW_RESTORED_FROM_COOKIE_SESSION',
              { userId: restored.user.id, role: restored.user.role, source: restored.source ?? null, authMode: getStoredAuthMode() },
              'info',
              resolvedTraceId
            );
            if (restored.source === 'bearer') {
              setStoredAuthMode('fallback');
            }
            if (restored.source === 'bearer' || getStoredAuthMode() !== 'cookie') {
              void syncServerPageSession({ includeAdminBridge: Boolean(restored.user.adminPanelAccess), traceId: resolvedTraceId });
            }
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.reason === 'unauthorized') {
            await pushClientAuthDebug('PI_AUTH_FLOW_COOKIE_SESSION_UNAUTHORIZED', { authMode: getStoredAuthMode(), hasSessionToken: Boolean(getStoredPiSessionToken()), state: getClientAuthDiagnosticState() }, 'info', resolvedTraceId);
            if (getStoredAuthMode() !== 'cookie' && Boolean(getStoredPiSessionToken())) {
              const previousMode = getStoredAuthMode();
              setStoredAuthMode('fallback');
              await pushClientAuthDebug('PI_AUTH_FLOW_RETRY_WITH_FALLBACK_AFTER_UNAUTHORIZED', { previousMode, state: getClientAuthDiagnosticState() }, 'info', resolvedTraceId);
              const retryWithFallback = await fetchCurrentUser(resolvedTraceId);
              if (retryWithFallback.ok) {
                setUser(retryWithFallback.user);
                setStatus('authenticated');
                return retryWithFallback.user;
              }
            }
            if (getStoredAuthMode() === 'cookie' && !shouldPreferPiBrowserBearerFallback()) {
              clearPiAuthToken('runAuthFlow_cookie_mode_unauthorized');
            }
            setUser(null);
            setStatus('guest');
            return null;
          }

          await pushClientAuthDebug('PI_AUTH_FLOW_COOKIE_SESSION_UNAVAILABLE', { reason: restored.reason, authMode: getStoredAuthMode() }, 'info', resolvedTraceId);
          setUser(null);
          setStatus('guest');
          return null;
        }

        setStatus('loading');
        const authenticatedUser = await authenticateAndResolveUser(resolvedTraceId);
        await pushClientAuthDebug(
          'PI_AUTH_FLOW_AUTHENTICATED',
          { userId: authenticatedUser.id, role: authenticatedUser.role },
          'info',
          resolvedTraceId
        );
        await pushPostAuthEvent('POST_AUTH_STATE_UPDATE_START', resolvedTraceId, {
          status: 'STARTED',
          data: { userId: authenticatedUser.id, role: authenticatedUser.role }
        });
        await syncServerPageSession({ includeAdminBridge: Boolean(authenticatedUser.adminPanelAccess), traceId: resolvedTraceId });
        setUser(authenticatedUser);
        setStatus('authenticated');
        await pushPostAuthEvent('POST_AUTH_STATE_UPDATE_SUCCESS', resolvedTraceId, {
          data: { userId: authenticatedUser.id, role: authenticatedUser.role, finalStatus: 'authenticated' }
        });
        await pushPostAuthEvent('POST_AUTH_CLIENT_READY', resolvedTraceId, {
          data: { userId: authenticatedUser.id, role: authenticatedUser.role }
        });
        return authenticatedUser;
      } catch (authError) {
        await pushClientAuthDebug(
          'PI_AUTH_FLOW_ERROR',
          { message: authError instanceof Error ? authError.message : 'Authentication failed' },
          'warn',
          resolvedTraceId
        );
        await pushPostAuthEvent('POST_AUTH_CLIENT_FAILED', resolvedTraceId, {
          status: 'FAILED',
          message: authError instanceof Error ? authError.message : 'Authentication failed',
          errorName: authError instanceof Error ? authError.name : 'AuthenticationError',
          errorCode: 'POST_AUTH_CLIENT_FAILURE'
        });
        clearPiAuthToken('runAuthFlow_catch');
        setUser(null);
        setStatus('guest');
        setError(authError instanceof Error ? authError.message : 'Authentication failed.');
        return null;
      } finally {
        requestRef.current = null;
      }
    })();

    return requestRef.current;
  }, []);

  const refreshUser = useCallback(async (traceId?: string | null) => {
    setStatus('loading');
    const resolvedUser = await runAuthFlow(false, traceId);
    if (!resolvedUser) {
      setStatus('guest');
    }
    return resolvedUser;
  }, [runAuthFlow]);

  const ensureAuthenticated = useCallback(async (traceId?: string | null) => {
    if (user) {
      setStatus('authenticated');
      return user;
    }

    setStatus('loading');
    const resolvedUser = await runAuthFlow(true, traceId);
    if (!resolvedUser) {
      setStatus('guest');
    }
    return resolvedUser;
  }, [runAuthFlow, user]);

  const logout = useCallback(async () => {
    const traceId = beginClientTrace();
    await pushClientAuthDebug('PI_AUTH_LOGOUT_START', {}, 'info', traceId);
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }, traceId), {
        forceBearer: getStoredAuthMode() !== 'cookie',
        includeRefreshHeader: true,
      }),
      credentials: 'include',
    }).catch(() => null);
    clearPiAuthToken('logout');
    setUser(null);
    setStatus('guest');
    setError('');
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedUser = await runAuthFlow(false, null);
      if (!active) return;
      setStatus(resolvedUser ? 'authenticated' : 'guest');
    })();

    return () => {
      active = false;
    };
  }, [runAuthFlow]);

  const value = useMemo<PiAuthContextValue>(() => ({
    user,
    status,
    error,
    ensureAuthenticated,
    refreshUser,
    logout,
  }), [ensureAuthenticated, error, logout, refreshUser, status, user]);

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (!context) {
    throw new Error('usePiAuth must be used inside PiAuthProvider.');
  }
  return context;
}
