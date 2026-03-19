'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPiAuthToken } from '@/lib/pi-auth-client';

const PROTECTED_PATHS = [
  '/account',
  '/admin',
  '/upload',
  '/notifications',
  '/profile',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AuthSessionBridge() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (typeof window === 'undefined') return;
    if (!isProtectedPath(pathname)) return;

    const token = getPiAuthToken();
    if (!token) return;

    const url = new URL(window.location.href);
    const currentToken = url.searchParams.get('authToken');

    if (currentToken === token) return;

    url.searchParams.set('authToken', token);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [pathname, router]);

  return null;
}