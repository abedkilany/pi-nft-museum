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
  '/me',
  '/my-artworks',
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
    credentials: 'include',
  }).catch(() => null);

  const payload = response ? await response.json().catch(() => null) : null;

  if (!response?.ok || !payload?.authenticated || !payload?.user) {
    return null;
  }

  return payload.user as AuthUser;
}

async function authenticateAndResolveUser() {
  const auth = await authenticateWithPi(['username', 'payments']);
  if (!auth?.accessToken) {
    throw new Error('Pi login did not return an access token.');
  }

  setPiAuthToken(auth.accessToken);

  const loginResponse = await fetch('/api/auth/pi/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({ accessToken: auth.accessToken }),
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  if (!loginResponse?.ok || !loginPayload?.ok) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  return fetchCurrentUser();
}

export function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [error, setError] = useState('');
  const bootstrappedRef = useRef(false);
  const requestRef = useRef<Promise<AuthUser | null> | null>(null);

  const runAuthFlow = useCallback(async (forcePiAuth = false) => {
    if (requestRef.current) return requestRef.current;

    requestRef.current = (async () => {
      try {
        setError('');

        if (!forcePiAuth) {
          const restoredUser = await fetchCurrentUser();
          if (restoredUser) {
            setUser(restoredUser);
            setStatus('authenticated');
            return restoredUser;
          }
        }

        const hasStoredToken = Boolean(getPiAuthToken());
        if (!forcePiAuth) {
          if (!hasStoredToken) {
            setUser(null);
            setStatus('guest');
            return null;
          }

          clearPiAuthToken();
          setUser(null);
          setStatus('guest');
          return null;
        }

        const authenticatedUser = await authenticateAndResolveUser();
        if (authenticatedUser) {
          setUser(authenticatedUser);
          setStatus('authenticated');
          return authenticatedUser;
        }

        clearPiAuthToken();
        setUser(null);
        setStatus('guest');
        return null;
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
    clearPiAuthToken();
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }).catch(() => null);
    setUser(null);
    setStatus('guest');
    setError('');
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let active = true;
    (async () => {
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

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (!context) {
    throw new Error('usePiAuth must be used inside PiAuthProvider.');
  }
  return context;
}
