'use client';

import { useEffect } from 'react';
import { getPiAuthToken } from '@/lib/pi-auth-client';

const PROTECTED_PREFIXES = ['/account', '/admin', '/upload'];
const AUTH_QUERY_KEY = 'authToken';

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function withAuthToken(url: URL, token: string) {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set(AUTH_QUERY_KEY, token);
  return nextUrl;
}

export function AuthSessionBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getPiAuthToken();
    if (!token) return;

    const currentUrl = new URL(window.location.href);
    if (isProtectedPath(currentUrl.pathname) && !currentUrl.searchParams.get(AUTH_QUERY_KEY)) {
      window.location.replace(withAuthToken(currentUrl, token).toString());
      return;
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const nextUrl = new URL(anchor.href, window.location.origin);
      if (nextUrl.origin !== window.location.origin) return;
      if (!isProtectedPath(nextUrl.pathname)) return;
      if (nextUrl.searchParams.get(AUTH_QUERY_KEY)) return;

      event.preventDefault();
      window.location.assign(withAuthToken(nextUrl, token).toString());
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
