'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { authenticateWithPi, waitForPiSdk } from '@/lib/pi';
import { getPiAuthToken, piApiFetch, setPiAuthToken } from '@/lib/pi-auth-client';

const ELIGIBLE_PATHS = new Set(['/', '/login']);
const AUTO_AUTH_LOCK_KEY = 'pi_auto_auth_lock';

function buildRedirectUrl(path: string) {
  const url = new URL(path, window.location.origin);
  return url.toString();
}

export function AutoPiAuth() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!pathname || !ELIGIBLE_PATHS.has(pathname)) return;
    if (startedRef.current) return;

    let cancelled = false;

    async function run() {
      const token = getPiAuthToken();
      if (token) {
        const existing = await piApiFetch('/api/auth/me', { method: 'GET', cache: 'no-store' }).then((res) => res.json()).catch(() => null);
        if (cancelled) return;
        if (existing?.ok && existing?.user) {
          if (pathname === '/login') {
            const nextUrl = searchParams.get('next') || (existing.user.role === 'admin' || existing.user.role === 'superadmin' ? '/admin' : '/account');
            window.location.replace(buildRedirectUrl(nextUrl));
          } else {
            router.refresh();
          }
          return;
        }
      }

      const lockValue = window.sessionStorage.getItem(AUTO_AUTH_LOCK_KEY);
      if (lockValue === 'running') return;

      const sdkReady = await waitForPiSdk(5000, 250);
      if (cancelled || !sdkReady) return;

      startedRef.current = true;
      window.sessionStorage.setItem(AUTO_AUTH_LOCK_KEY, 'running');

      try {
        const authResult = await authenticateWithPi(['username']);
        if (!authResult?.accessToken) return;

        const response = await fetch('/api/auth/pi/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accessToken: authResult.accessToken }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok || !data?.token) {
          return;
        }

        setPiAuthToken(data.token);

        const me = await piApiFetch('/api/auth/me', { method: 'GET', cache: 'no-store' }).then((res) => res.json()).catch(() => null);
        if (cancelled || !me?.ok || !me?.user) return;

        const nextUrl = searchParams.get('next') || (me.user.role === 'admin' || me.user.role === 'superadmin' ? '/admin' : '/account');
        window.location.replace(buildRedirectUrl(nextUrl));
      } finally {
        window.sessionStorage.removeItem(AUTO_AUTH_LOCK_KEY);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  return null;
}
