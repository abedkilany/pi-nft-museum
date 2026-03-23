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

async function readCurrentUser() {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    headers: getPiAuthHeaders(),
    cache: 'no-store',
  }).catch(() => null);

  const payload = response ? await response.json().catch(() => null) : null;

  if (!response?.ok || !payload?.authenticated || !payload?.user) {
    return {
      user: null,
      reason: response?.status === 401 ? 'unauthorized' : 'unavailable',
    } as const;
  }

  return {
    user: payload.user as AuthUser,
    reason: null,
  } as const;
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
      'X-App-Request': 'pi-web',
    },
    body: JSON.stringify({ accessToken: auth.accessToken }),
  }).catch(() => null);

  const loginPayload = loginResponse ? await loginResponse.json().catch(() => null) : null;

  if (!loginResponse?.ok || !loginPayload?.ok || !loginPayload?.session?.token) {
    throw new Error(loginPayload?.error || 'Server login failed.');
  }

  setPiAuthToken(String(loginPayload.session.token));

  if (loginPayload?.user?.id && loginPayload?.user?.username && loginPayload?.user?.role) {
    return {
      id: Number(loginPayload.user.id),
      username: String(loginPayload.user.username),
      email: loginPayload.user.email ? String(loginPayload.user.email) : undefined,
      role: String(loginPayload.user.role),
      piUid: loginPayload.user.piUid ? String(loginPayload.user.piUid) : null,
      piUsername: loginPayload.user.piUsername ? String(loginPayload.user.piUsername) : null,
    } satisfies AuthUser;
  }

  const resolved = await readCurrentUser();
  if (!resolved.user) {
    throw new Error('Connected with Pi but failed to restore your session.');
  }

  return resolved.user;
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

        const hasStoredToken = Boolean(getPiAuthToken());
        if (hasStoredToken) {
          const restored = await readCurrentUser();
          if (restored.user) {
            setUser(restored.user);
            setStatus('authenticated');
            return restored.user;
          }

          if (restored.reason === 'unauthorized') {
            clearPiAuthToken();
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
        const message = authError instanceof Error ? authError.message : 'Authentication failed.';
        setUser(null);
        setStatus('guest');
        setError(message);
        throw authError instanceof Error ? authError : new Error(message);
      } finally {
        requestRef.current = null;
      }
    })();

    return requestRef.current;
  }, []);

  const refreshUser = useCallback(async () => {
    setStatus('loading');
    const restoredUser = await runAuthFlow(false);
    if (!restoredUser) setStatus('guest');
    return restoredUser;
  }, [runAuthFlow]);

  const ensureAuthenticated = useCallback(async () => {
    if (user) {
      setStatus('authenticated');
      return user;
    }

    setStatus('loading');
    const restoredUser = await runAuthFlow(true);
    if (!restoredUser) setStatus('guest');
    return restoredUser;
  }, [runAuthFlow, user]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getPiAuthHeaders({ Accept: 'application/json', 'X-App-Request': 'pi-web' }),
    }).catch(() => null);
    clearPiAuthToken();
    setUser(null);
    setStatus('guest');
    setError('');
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void runAuthFlow(isProtectedPath(pathname));
  }, [pathname, runAuthFlow]);

  useEffect(() => {
    if (status === 'guest' && isProtectedPath(pathname) && getPiAuthToken()) {
      void runAuthFlow(false);
    }
  }, [pathname, runAuthFlow, status]);

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
