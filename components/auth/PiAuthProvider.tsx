use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authenticateWithPi } from '@/lib/pi';
import { clearPiAuthToken, getPiAuthHeaders, getPiAuthToken, setPiAuthToken } from '@/lib/pi-auth-client';

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
  ensureAuthenticated: () => Promise<AuthUser | null>;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const PiAuthContext = createContext<PiAuthContextValue | undefined>(undefined);

type FetchCurrentUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'unauthorized' | 'network' | 'server' };

async function fetchCurrentUser(): Promise<FetchCurrentUserResult> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return { ok: false, reason: 'network' };
  }

  const payload = await response.json().catch(() => null);

  if (response.ok && payload?.authenticated && payload?.user) {
    return { ok: true, user: payload.user as AuthUser };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  return { ok: false, reason: 'server' };
}

async function authenticateAndResolveUser() {
  const auth = await authenticateWithPi(['username', 'payments']);
  if (!auth?.accessToken) {
    throw new Error('Pi login did not return an access token.');
  }

  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ accessToken: auth.accessToken }),
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  if (!loginResponse?.ok || !loginPayload?.ok || !loginPayload?.session?.token) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  setPiAuthToken(String(loginPayload.session.token));

  const meResult = await fetchCurrentUser();
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

  const runAuthFlow = useCallback(async (forcePiAuth = false) => {
    if (requestRef.current) return requestRef.current;

    requestRef.current = (async () => {
      try {
        setError('');

        const hasStoredToken = Boolean(getPiAuthToken());

        if (!forcePiAuth && hasStoredToken) {
          const restored = await fetchCurrentUser();
          if (restored.ok) {
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.reason === 'unauthorized') {
            clearPiAuthToken();
            setUser(null);
            setStatus('guest');
            return null;
          }
        }

        if (!forcePiAuth) {
          setUser(null);
          setStatus('guest');
          return null;
        }

        setStatus('loading');
        const authenticatedUser = await authenticateAndResolveUser();
        setUser(authenticatedUser);
        setStatus('authenticated');
        return authenticatedUser;
      } catch (authError) {
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

  const refreshUser = useCallback(async () => {
    setStatus('loading');
    const resolvedUser = await runAuthFlow(false);
    if (!resolvedUser) {
      setStatus('guest');
    }
    return resolvedUser;
  }, [runAuthFlow]);

  const ensureAuthenticated = useCallback(async () => {
    if (user) {
      setStatus('authenticated');
      return user;
    }

    setStatus('loading');
    const resolvedUser = await runAuthFlow(true);
    if (!resolvedUser) {
      setStatus('guest');
    }
    return resolvedUser;
  }, [runAuthFlow, user]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders({ Accept: 'application/json' }),
    }).catch(() => null);
    clearPiAuthToken();
    setUser(null);
    setStatus('guest');
    setError('');
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const resolvedUser = await runAuthFlow(false);
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
