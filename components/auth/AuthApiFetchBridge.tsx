'use client';

import { useEffect } from 'react';
import { getPiAuthToken } from '@/lib/pi-auth-client';

export function AuthApiFetchBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

      const isApiRequest = requestUrl.startsWith('/api/') || requestUrl.startsWith(`${window.location.origin}/api/`);
      if (!isApiRequest) {
        return originalFetch(input as any, init);
      }

      const token = getPiAuthToken();
      if (!token) {
        return originalFetch(input as any, init);
      }

      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const nextInit: RequestInit = {
        ...init,
        headers,
        credentials: init?.credentials ?? 'omit',
      };

      return originalFetch(input as any, nextInit);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
