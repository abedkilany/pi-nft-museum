import { buildObservabilityHeaders } from '@/lib/observability-client';

// Cookie-based auth is authoritative. These helpers remain as no-op compatibility
// shims so older components do not rely on in-memory session state anymore.
export function getPiAuthToken() {
  return 'cookie-session';
}

export function setPiAuthToken(_token: string) {}

export function clearPiAuthToken() {}

export function getPiAuthHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');
  return headers;
}

async function attemptRefresh() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: getPiAuthHeaders(buildObservabilityHeaders({ Accept: 'application/json' })),
    credentials: 'include',
    cache: 'no-store',
  }).catch(() => null);

  if (response?.ok) {
    return true;
  }

  return false;
}

function isAuthMaintenanceEndpoint(input: RequestInfo | URL) {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  return raw.includes('/api/auth/refresh') || raw.includes('/api/auth/logout');
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestInit = {
    ...init,
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
    credentials: 'include' as const,
    cache: init.cache ?? 'no-store',
  };

  let response = await fetch(input, requestInit);

  if (response.status === 401 && !isAuthMaintenanceEndpoint(input)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      response = await fetch(input, requestInit);
    }
  }

  return response;
}
