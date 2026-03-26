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
  return existing || beginClientTrace();
}

export function buildObservabilityHeaders(init?: HeadersInit, preferredTraceId?: string | null): Headers {
  const traceId = consumeOrCreateTraceId(preferredTraceId);
  const headers = new Headers(init || {});
  headers.set('X-Trace-Id', traceId);
  headers.set('X-Correlation-Id', traceId);
  headers.set('X-Session-Id', getClientSessionId());
  return headers;
}
