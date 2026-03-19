'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getPiAuthToken, setPiAuthToken, syncPiAuthCookie } from '@/lib/pi-auth-client';

export default function AuthSessionBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    const tokenFromUrl = currentUrl.searchParams.get('authToken');

    if (tokenFromUrl) {
      setPiAuthToken(tokenFromUrl);
      currentUrl.searchParams.delete('authToken');
      window.history.replaceState(window.history.state, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      return;
    }

    const storedToken = getPiAuthToken();
    if (!storedToken) return;

    syncPiAuthCookie(storedToken);
  }, [pathname]);

  return null;
}
