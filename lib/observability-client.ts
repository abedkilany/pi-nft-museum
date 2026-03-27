'use client';

const SESSION_KEY = 'app_event_session_id';
const ACTIVE_TRACE_KEY = 'app_event_active_trace_id';

function getStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getClientSessionId() {
  const storage = getStorage();
  const existing = storage?.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  storage?.setItem(SESSION_KEY, created);
  return created;
}

export function getActiveTraceId() {
  return getStorage()?.getItem(ACTIVE_TRACE_KEY) || null;
}

export function setActiveTraceId(traceId: string | null) {
  const storage = getStorage();
  if (!storage) return;
  if (!traceId) {
    storage.removeItem(ACTIVE_TRACE_KEY);
    return;
  }
  storage.setItem(ACTIVE_TRACE_KEY, traceId);
}

export function beginClientTrace(preferredTraceId?: string | null) {
  const traceId = preferredTraceId || crypto.randomUUID();
  setActiveTraceId(traceId);
  return traceId;
}

export function consumeOrCreateTraceId(preferredTraceId?: string | null) {
  const existing = preferredTraceId || getActiveTraceId();
  if (existing) {
    setActiveTraceId(existing);
    return existing;
  }
  return beginClientTrace();
}

export function buildObservabilityHeaders(init?: HeadersInit, preferredTraceId?: string | null): Headers {
  const traceId = consumeOrCreateTraceId(preferredTraceId);
  const headers = new Headers(init || {});
  headers.set('X-Trace-Id', traceId);
  headers.set('X-Correlation-Id', traceId);
  headers.set('X-Session-Id', getClientSessionId());
  return headers;
}


type ClientAppEventPayload = Record<string, unknown> & {
  category: string;
  type: string;
  name: string;
  status?: string;
};

function currentRoute() {
  if (typeof window === 'undefined') return null;
  return window.location.pathname || '/';
}

function currentUrl() {
  if (typeof window === 'undefined') return null;
  return window.location.href;
}

export function sendClientAppEvent(payload: ClientAppEventPayload, options?: { beginTrace?: boolean; keepalive?: boolean }) {
  if (typeof window === 'undefined') return;

  const sessionId = getClientSessionId();
  const incomingTraceId = typeof payload.traceId === 'string' ? payload.traceId : null;
  const traceId = options?.beginTrace ? beginClientTrace(incomingTraceId) : consumeOrCreateTraceId(incomingTraceId);
  const body = JSON.stringify({
    status: 'SUCCESS',
    source: 'CLIENT',
    ...payload,
    sessionId,
    traceId,
    correlationId: traceId,
    route: typeof payload.route === 'string' ? payload.route : currentRoute(),
    url: typeof payload.url === 'string' ? payload.url : currentUrl(),
  });

  if (navigator.sendBeacon && options?.keepalive !== false) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/events', blob);
    return;
  }

  void fetch('/api/events', {
    method: 'POST',
    headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, traceId),
    body,
    keepalive: options?.keepalive !== false,
    cache: 'no-store'
  }).catch(() => null);
}
