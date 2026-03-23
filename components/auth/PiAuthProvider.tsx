'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
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

const PROTECTED_PREFIXES = [
  '/profile',
  '/artwork',
  '/account',
  '/admin',
  '/upload',
  '/notifications',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function fetchCurrentUser() {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    cache: 'no-store',
    credentials: 'same-origin',
  }).catch(() => null);

  const payload = response ? await response.json().catch(() => null) : null;

  if (response?.status === 401) {
    return { user: null, unauthorized: true } as const;
  }

  if (!response?.ok || !payload?.authenticated || !payload?.user) {
    return { user: null, unauthorized: false } as const;
  }

  return { user: payload.user as AuthUser, unauthorized: false } as const;
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
    credentials: 'same-origin',
    body: JSON.stringify({ accessToken: auth.accessToken }),
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  if (!loginResponse?.ok || !loginPayload?.ok || !loginPayload?.session?.token) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  setPiAuthToken(String(loginPayload.session.token));

  const resolved = await fetchCurrentUser();
  if (resolved.user) return resolved.user;

  if (loginPayload?.user) {
    return loginPayload.user as AuthUser;
  }

  throw new Error('Unable to confirm the logged in user.');
}

export function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
          if (restored.user) {
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.unauthorized) {
            clearPiAuthToken();
          }
        }

        if (!forcePiAuth) {
          setUser(null);
          setStatus('guest');
          return null;
        }

        const authenticatedUser = await authenticateAndResolveUser();
        setUser(authenticatedUser);
        setStatus('authenticated');
        return authenticatedUser;
      } catch (authError) {
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
    const restoredUser = await runAuthFlow(false);
    if (!restoredUser) {
      setStatus('guest');
    }
    return restoredUser;
  }, [runAuthFlow]);

  const ensureAuthenticated = useCallback(async () => {
    if (user) {
      setStatus('authenticated');
      return user;
    }

    setStatus('loading');
    const restoredUser = await runAuthFlow(true);
    if (!restoredUser) {
      setStatus('guest');
    }
    return restoredUser;
  }, [runAuthFlow, user]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders({ Accept: 'application/json' }),
      credentials: 'same-origin',
    }).catch(() => null);
    clearPiAuthToken();
    setUser(null);
    setStatus('guest');
    setError('');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setStatus((current) => (current === 'authenticated' ? current : 'loading'));
      const shouldForce = isProtectedPath(pathname);
      const resolvedUser = await runAuthFlow(shouldForce);
      if (!active) return;
      setStatus(resolvedUser ? 'authenticated' : 'guest');
    })();

    return () => {
      active = false;
    };
  }, [pathname, runAuthFlow]);

  const value = useMemo<PiAuthContextValue>(() => ({
    user,
    status,
    error,
    ensureAuthenticated,
    refreshUser,
    logout,
  }), [ensureAuthenticated, error, logout, refreshUser, status, user]);

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (!context) {
    throw new Error('usePiAuth must be used inside PiAuthProvider.');
  }
  return context;
}
