'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authenticateWithPi } from '@/lib/domains/pi';
import { clearPiAuthToken, getPiAuthHeaders, getStoredAuthMode, getStoredPiRefreshToken, getStoredPiSessionToken, piApiFetch, shouldUseBearerFallbackClient, storePiBrowserAuth } from '@/lib/pi-auth-client';
import { buildObservabilityHeaders, consumeOrCreateTraceId, getClientSessionId } from '@/lib/observability-client';
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
  ensurePaymentScope: (traceId?: string | null) => Promise<AuthUser | null>;
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
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'unauthorized' | 'network' | 'server' };


async function retryWithStoredFallback(traceId?: string | null): Promise<FetchCurrentUserResult> {
  const sessionToken = getStoredPiSessionToken();
  const refreshToken = getStoredPiRefreshToken();
  if (!sessionToken || !refreshToken) {
    return { ok: false, reason: 'unauthorized' };
  }

  storePiBrowserAuth({
    sessionToken,
    refreshToken,
    mode: 'pi-browser-bearer-fallback',
  });

  await pushClientAuthDebug('PI_AUTH_COOKIE_RESTORE_SWITCHED_TO_FALLBACK', {}, 'warn', traceId);

  const retryResponse = await piApiFetch('/api/auth/me', {
    method: 'GET',
    headers: buildObservabilityHeaders(undefined, traceId),
    cache: 'no-store',
  }).catch(() => null);

  if (!retryResponse) {
    return { ok: false, reason: 'network' };
  }

  const retryPayload = await retryResponse.json().catch(() => null);
  if (retryResponse.ok && retryPayload?.authenticated && retryPayload?.user) {
    return { ok: true, user: retryPayload.user as AuthUser };
  }

  return { ok: false, reason: retryResponse.status === 401 ? 'unauthorized' : 'server' };
}

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
    return { ok: true, user: payload.user as AuthUser };
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
    if (getStoredAuthMode() !== 'pi-browser-bearer-fallback' && getStoredPiSessionToken() && getStoredPiRefreshToken()) {
      const fallbackRetry = await retryWithStoredFallback(resolvedTraceId);
      if (fallbackRetry.ok) {
        return fallbackRetry;
      }
    }

    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: false, reason: 'server' };
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

  for (let index = 0; index < delays.length; index += 1) {
    const delayMs = delays[index];
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    const meResult = await fetchCurrentUser(resolvedTraceId);
    if (meResult.ok) {
      if (index > 0) {
        await pushClientAuthDebug('PI_AUTH_SESSION_RESTORE_RECOVERED_AFTER_RETRY', { attempt: index + 1, delayMs }, 'info', resolvedTraceId);
      }
      return { ok: true as const, user: meResult.user };
    }

    await pushClientAuthDebug('PI_AUTH_SESSION_RESTORE_RETRY_RESULT', { attempt: index + 1, delayMs, reason: meResult.reason }, meResult.reason === 'unauthorized' ? 'info' : 'warn', resolvedTraceId);
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
  const resolvedTraceId = consumeOrCreateTraceId(traceId);
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

  await pushClientAuthDebug('PI_AUTH_SERVER_LOGIN_START', {}, 'info', resolvedTraceId);
  const prefersBearerFallback = shouldUseBearerFallbackClient();
  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: buildObservabilityHeaders(
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
        'X-Auth-Mode': prefersBearerFallback ? 'pi-browser-bearer-fallback' : 'cookie-session',
      },
      resolvedTraceId
    ),
    body: JSON.stringify({ accessToken: auth.accessToken, requiresFallbackAuth: prefersBearerFallback }),
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
    },
    loginResponse?.ok ? 'info' : 'warn',
    resolvedTraceId
  );

  if (!loginResponse?.ok || !loginPayload?.ok) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  const fallbackSessionToken = typeof loginPayload?.session?.token === 'string' ? loginPayload.session.token : null;
  const fallbackRefreshToken = typeof loginPayload?.session?.refreshToken === 'string' ? loginPayload.session.refreshToken : null;

  if (!fallbackSessionToken || !fallbackRefreshToken) {
    await pushClientAuthDebug(
      'PI_AUTH_FALLBACK_TOKENS_MISSING',
      {
        hasFallbackSessionToken: Boolean(fallbackSessionToken),
        hasFallbackRefreshToken: Boolean(fallbackRefreshToken),
      },
      'warn',
      resolvedTraceId
    );
    throw new Error('Server login succeeded, but the fallback session credentials were missing.');
  }

  storePiBrowserAuth({
    sessionToken: fallbackSessionToken,
    refreshToken: fallbackRefreshToken,
    mode: prefersBearerFallback ? 'pi-browser-bearer-fallback' : 'cookie-session',
  });

  if (prefersBearerFallback) {
    await pushClientAuthDebug(
      'PI_AUTH_BEARER_FALLBACK_ENABLED',
      {
        hasRefreshToken: true,
        transport: loginPayload?.session?.transport ?? null,
      },
      'info',
      resolvedTraceId
    );
  }

  await pushClientAuthDebug('PI_AUTH_SESSION_TOKEN_STORED', {
    prefersBearerFallback,
    hasFallbackSessionToken: Boolean(fallbackSessionToken),
    hasFallbackRefreshToken: Boolean(fallbackRefreshToken),
    transport: loginPayload?.session?.transport ?? null,
  }, 'info', resolvedTraceId);

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
          const restored = await fetchCurrentUser(resolvedTraceId);
          if (restored.ok) {
            await pushClientAuthDebug(
              'PI_AUTH_FLOW_RESTORED_FROM_COOKIE_SESSION',
              { userId: restored.user.id, role: restored.user.role },
              'info',
              resolvedTraceId
            );
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.reason === 'unauthorized') {
            await pushClientAuthDebug('PI_AUTH_FLOW_COOKIE_SESSION_UNAUTHORIZED', {}, 'info', resolvedTraceId);
            clearPiAuthToken();
            setUser(null);
            setStatus('guest');
            return null;
          }

          await pushClientAuthDebug('PI_AUTH_FLOW_COOKIE_SESSION_UNAVAILABLE', { reason: restored.reason }, 'info', resolvedTraceId);
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
        clearPiAuthToken();
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

  const ensurePaymentScope = useCallback(async (traceId?: string | null) => {
    setStatus('loading');
    const resolvedUser = await runAuthFlow(true, traceId);
    if (!resolvedUser) {
      setStatus('guest');
    }
    return resolvedUser;
  }, [runAuthFlow]);

  const logout = useCallback(async () => {
    const traceId = consumeOrCreateTraceId();
    await pushClientAuthDebug('PI_AUTH_LOGOUT_START', {}, 'info', traceId);
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }, traceId)),
      credentials: 'include',
    }).catch(() => null);
    clearPiAuthToken();
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
    ensurePaymentScope,
    refreshUser,
    logout,
  }), [ensureAuthenticated, ensurePaymentScope, error, logout, refreshUser, status, user]);

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (!context) {
    throw new Error('usePiAuth must be used inside PiAuthProvider.');
  }
  return context;
}
