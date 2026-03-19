'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

function withAuthToken(rawUrl: string, token: string) {
  try {
    const url = new URL(rawUrl, window.location.origin);

    if (url.origin !== window.location.origin) return null;
    if (!isProtectedPath(url.pathname)) return null;
    if (url.searchParams.get('authToken') === token) return `${url.pathname}${url.search}${url.hash}`;

    url.searchParams.set('authToken', token);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function shouldIgnoreAnchor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute('href');
  if (!href) return true;
  if (href.startsWith('#')) return true;
  if (href.startsWith('mailto:') || href.startsWith('tel:')) return true;
  if (anchor.hasAttribute('download')) return true;

  const target = anchor.getAttribute('target');
  if (target && target !== '_self') return true;

  return false;
}

export default function AuthSessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getPiAuthToken();
    if (!token) return;

    const syncCurrentUrl = () => {
      const current = new URL(window.location.href);
      if (!isProtectedPath(current.pathname)) return;
      if (current.searchParams.get('authToken') === token) return;
      current.searchParams.set('authToken', token);
      window.history.replaceState(window.history.state, '', `${current.pathname}${current.search}${current.hash}`);
    };

    const updateAnchorHref = (anchor: HTMLAnchorElement) => {
      if (shouldIgnoreAnchor(anchor)) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      const updated = withAuthToken(href, token);
      if (!updated) return;
      if (anchor.getAttribute('href') !== updated) {
        anchor.setAttribute('href', updated);
      }
    };

    const syncAnchors = () => {
      document.querySelectorAll('a[href]').forEach((node) => {
        if (node instanceof HTMLAnchorElement) updateAnchorHref(node);
      });
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      updateAnchorHref(anchor);
    };

    syncCurrentUrl();
    syncAnchors();

    const observer = new MutationObserver(() => {
      syncAnchors();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href'],
    });

    document.addEventListener('click', handleClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname]);

  return null;
}
