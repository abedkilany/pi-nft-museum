import { buildObservabilityHeaders } from '@/lib/observability-client';

export async function adminApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: buildObservabilityHeaders(
      {
        ...(init.headers || {}),
        'X-App-Request': 'admin-web',
      } as HeadersInit,
    ),
    cache: init.cache ?? 'no-store',
  });
}
