'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authenticateWithPi } from '@/lib/pi';
import { clearPiAuthToken, getPiAuthHeaders, getPiAuthToken, setPiAuthToken } from '@/lib/pi-auth-client';
import { beginClientTrace, buildObservabilityHeaders, consumeOrCreateTraceId } from '@/lib/observability-client';

type AuthUser = {
  id: number;
  username: string;
  email?: string;
  role: string;
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

async function fetchCurrentUser(traceId?: string | null): Promise<FetchCurrentUserResult> {
  const resolvedTraceId = consumeOrCreateTraceId(traceId);
  await pushClientAuthDebug('PI_AUTH_ME_REQUEST_START', {}, 'info', resolvedTraceId);

  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(buildObservabilityHeaders(undefined, resolvedTraceId)),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    await pushClientAuthDebug('PI_AUTH_ME_REQUEST_NETWORK_FAILURE', {}, 'warn', resolvedTraceId);
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

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: false, reason: 'server' };
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

  await pushClientAuthDebug('PI_AUTH_SERVER_LOGIN_START', {}, 'info', resolvedTraceId);
  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: buildObservabilityHeaders(
      {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-App-Request': 'pi-web',
      },
      resolvedTraceId
    ),
    body: JSON.stringify({ accessToken: auth.accessToken }),
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  await pushClientAuthDebug(
    'PI_AUTH_SERVER_LOGIN_RESPONSE',
    {
      ok: Boolean(loginResponse?.ok),
      status: loginResponse?.status ?? null,
      hasSessionToken: Boolean(loginPayload?.session?.token),
      error: loginPayload?.error ?? null,
      code: loginPayload?.code ?? null,
    },
    loginResponse?.ok ? 'info' : 'warn',
    resolvedTraceId
  );

  if (!loginResponse?.ok || !loginPayload?.ok || !loginPayload?.session?.token) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  setPiAuthToken(String(loginPayload.session.token));
  await pushClientAuthDebug('PI_AUTH_SESSION_TOKEN_STORED', {}, 'info', resolvedTraceId);

  const meResult = await fetchCurrentUser(resolvedTraceId);
  if (meResult.ok) {
    return meResult.user;
  }

  if (loginPayload?.user) {
    return loginPayload.user as AuthUser;
  }

  throw new Error('Pi login succeeded, but the session could not be restored.');
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

        const hasStoredToken = Boolean(getPiAuthToken());

        if (!forcePiAuth && hasStoredToken) {
          const restored = await fetchCurrentUser(resolvedTraceId);
          if (restored.ok) {
            await pushClientAuthDebug(
              'PI_AUTH_FLOW_RESTORED_FROM_SESSION',
              { userId: restored.user.id, role: restored.user.role },
              'info',
              resolvedTraceId
            );
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.reason === 'unauthorized') {
            await pushClientAuthDebug('PI_AUTH_FLOW_STORED_SESSION_UNAUTHORIZED', {}, 'info', resolvedTraceId);
            clearPiAuthToken();
            setUser(null);
            setStatus('guest');
            return null;
          }
        }

        if (!forcePiAuth) {
          await pushClientAuthDebug('PI_AUTH_FLOW_NO_SESSION_AND_NO_FORCE', {}, 'info', resolvedTraceId);
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
        setUser(authenticatedUser);
        setStatus('authenticated');
        return authenticatedUser;
      } catch (authError) {
        await pushClientAuthDebug(
          'PI_AUTH_FLOW_ERROR',
          { message: authError instanceof Error ? authError.message : 'Authentication failed' },
          'warn',
          resolvedTraceId
        );
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

  const logout = useCallback(async () => {
    const traceId = beginClientTrace();
    await pushClientAuthDebug('PI_AUTH_LOGOUT_START', {}, 'info', traceId);
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' }, traceId)),
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
