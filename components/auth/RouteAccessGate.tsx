'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { clearPiAuthToken, getPiAuthToken, piApiFetch } from '@/lib/pi-auth-client';

const PUBLIC_PATH_PREFIXES = ['/gallery', '/review', '/community', '/premium', '/privacy-policy', '/terms-of-service', '/artwork'];
const PROTECTED_PREFIXES = ['/account', '/admin', '/notifications'];
const PROTECTED_EXACT_PATHS = new Set(['/upload', '/profile']);

type AuthState = 'idle' | 'checking' | 'done';

function isPublicPath(pathname: string) {
  if (pathname === '/') return false;
  if (pathname === '/login') return false;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedPath(pathname: string) {
  if (PROTECTED_EXACT_PATHS.has(pathname)) return true;
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function RouteAccessGate() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<AuthState>('idle');

  const nextPath = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setState('done');
      return;
    }

    let cancelled = false;

    async function run() {
      const token = getPiAuthToken();
      const isEntryPath = pathname === '/' || pathname === '/login';
      const protectedPath = isProtectedPath(pathname);

      if (!token) {
        if (protectedPath) {
          setState('checking');
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        setState('done');
        return;
      }

      setState('checking');
      const response = await piApiFetch('/api/auth/me', { method: 'GET', cache: 'no-store' }).catch(() => null);
      const data = response ? await response.json().catch(() => null) : null;

      if (cancelled) return;

      if (!response?.ok || !data?.ok || !data?.user) {
        clearPiAuthToken();
        if (protectedPath) {
          router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        setState('done');
        return;
      }

      const role = data.user.role as string;
      const isAdmin = role === 'admin' || role === 'superadmin';

      if (pathname.startsWith('/admin') && !isAdmin) {
        router.replace('/account');
        return;
      }

      if (isEntryPath) {
        const nextUrl = searchParams?.get('next');
        router.replace(nextUrl || (isAdmin ? '/admin' : '/account'));
        return;
      }

      setState('done');
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [nextPath, pathname, router, searchParams]);

  const shouldBlock = state === 'checking' && (pathname === '/' || pathname === '/login' || isProtectedPath(pathname));
  if (!shouldBlock) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,16,0.82)', display: 'grid', placeItems: 'center', zIndex: 9999 }}>
      <div className="card" style={{ padding: '18px 22px', minWidth: '240px', textAlign: 'center' }}>
        <strong>Checking session…</strong>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>Please wait.</p>
      </div>
    </div>
  );
}
