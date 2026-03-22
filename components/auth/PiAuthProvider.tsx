'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authenticateWithPi } from '@/lib/pi';
import { clearPiAuthToken, getPiAuthToken, setPiAuthToken } from '@/lib/pi-auth-client';

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

  const resolvedUser = await fetchCurrentUser();
  if (!resolvedUser) {
    throw new Error('Pi login succeeded, but the session could not be restored.');
  }

  return resolvedUser;
}

export function PiAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [error, setError] = useState('');
  const requestRef = useRef<Promise<AuthUser | null> | null>(null);
  const lastForcedPathRef = useRef<string | null>(null);

  const resolveUser = useCallback(async (forcePiAuth = false) => {
    if (requestRef.current) return requestRef.current;

    requestRef.current = (async () => {
      try {
        setError('');

        const restoredUser = await fetchCurrentUser();
        if (restoredUser) {
          setUser(restoredUser);
          setStatus('authenticated');
          return restoredUser;
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
    const restoredUser = await resolveUser(false);
    if (!restoredUser) {
      setStatus('guest');
    }
    return restoredUser;
  }, [resolveUser]);

  const ensureAuthenticated = useCallback(async () => {
    if (user) {
      setStatus('authenticated');
      return user;
    }

    setStatus('loading');
    const restoredUser = await resolveUser(true);
    if (!restoredUser) {
      setStatus('guest');
    }
    return restoredUser;
  }, [resolveUser, user]);

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
    lastForcedPathRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;
    const protectedPath = isProtectedPath(pathname);

    (async () => {
      setStatus((current) => (current === 'authenticated' ? current : 'loading'));

      const restoredUser = await resolveUser(false);
      if (!active) return;

      if (restoredUser) {
        lastForcedPathRef.current = null;
        setStatus('authenticated');
        return;
      }

      if (!protectedPath) {
        setStatus('guest');
        return;
      }

      if (lastForcedPathRef.current === pathname) {
        setStatus('guest');
        return;
      }

      const hasStoredToken = Boolean(getPiAuthToken());
      if (!hasStoredToken && pathname !== '/login') {
        lastForcedPathRef.current = pathname;
      }

      const forcedUser = await resolveUser(true);
      if (!active) return;

      if (forcedUser) {
        lastForcedPathRef.current = null;
        setStatus('authenticated');
        return;
      }

      lastForcedPathRef.current = pathname;
      setStatus('guest');
    })();

    return () => {
      active = false;
    };
  }, [pathname, resolveUser]);

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
