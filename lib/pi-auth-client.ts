import { buildObservabilityHeaders } from '@/lib/observability-client';

let sessionHint = false;

export function getPiAuthToken() {
  return sessionHint ? 'cookie-session' : null;
}

export function setPiAuthToken(_token: string) {
  sessionHint = true;
}

export function clearPiAuthToken() {
  sessionHint = false;
}

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
    sessionHint = true;
    return true;
  }

  return false;
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let response = await fetch(input, {
    ...init,
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
    credentials: 'include',
    cache: init.cache ?? 'no-store',
  });

  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => null);
    const reason = typeof payload?.reason === 'string' ? payload.reason : null;
    if (reason === 'NO_SESSION_TOKEN' || reason === 'INVALID_OR_EXPIRED_SESSION') {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        response = await fetch(input, {
          ...init,
          headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
          credentials: 'include',
          cache: init.cache ?? 'no-store',
        });
      } else {
        clearPiAuthToken();
      }
    }
  }

  return response;
}
