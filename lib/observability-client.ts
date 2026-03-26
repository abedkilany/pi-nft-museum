'use client';

const SESSION_KEY = 'app_event_session_id';
const ACTIVE_TRACE_KEY = 'app_event_active_trace_id';
const ACTIVE_SPAN_KEY = 'app_event_active_span_id';

function getStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function createId() {
  return crypto.randomUUID();
}

export function getClientSessionId() {
  const storage = getStorage();
  const existing = storage?.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = createId();
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

export function getActiveSpanId() {
  return getStorage()?.getItem(ACTIVE_SPAN_KEY) || null;
}

export function setActiveSpanId(spanId: string | null) {
  const storage = getStorage();
  if (!storage) return;
  if (!spanId) {
    storage.removeItem(ACTIVE_SPAN_KEY);
    return;
  }
  storage.setItem(ACTIVE_SPAN_KEY, spanId);
}

export function beginClientTrace(preferredTraceId?: string | null) {
  const traceId = preferredTraceId || createId();
  setActiveTraceId(traceId);
  setActiveSpanId(null);
  return traceId;
}

export function consumeOrCreateTraceId(preferredTraceId?: string | null) {
  const existing = preferredTraceId || getActiveTraceId();
  return existing || beginClientTrace();
}

export function beginClientSpan(preferredTraceId?: string | null, parentSpanId?: string | null) {
  const traceId = consumeOrCreateTraceId(preferredTraceId);
  const spanId = createId();
  const resolvedParent = parentSpanId === undefined ? getActiveSpanId() : parentSpanId;
  setActiveSpanId(spanId);
  return {
    traceId,
    spanId,
    parentSpanId: resolvedParent,
  };
}

export function endClientSpan(restoreParentSpanId?: string | null) {
  if (restoreParentSpanId === undefined) return;
  setActiveSpanId(restoreParentSpanId);
}

export function buildObservabilityHeaders(init?: HeadersInit, preferredTraceId?: string | null, preferredSpanId?: string | null, preferredParentSpanId?: string | null): Headers {
  const traceId = consumeOrCreateTraceId(preferredTraceId);
  const headers = new Headers(init || {});
  headers.set('X-Trace-Id', traceId);
  headers.set('X-Correlation-Id', traceId);
  headers.set('X-Session-Id', getClientSessionId());
  const spanId = preferredSpanId || getActiveSpanId();
  const parentSpanId = preferredParentSpanId === undefined ? null : preferredParentSpanId;
  if (spanId) headers.set('X-Span-Id', spanId);
  if (parentSpanId) headers.set('X-Parent-Span-Id', parentSpanId);
  return headers;
}

type ClientEventPayload = Record<string, unknown> & {
  category: string;
  type: string;
  name: string;
  status?: string;
};

export function sendClientEvent(payload: ClientEventPayload, options?: { beginTrace?: boolean; beginSpan?: boolean }) {
  if (typeof window === 'undefined') return;

  const sessionId = getClientSessionId();
  const traceId = options?.beginTrace
    ? beginClientTrace(typeof payload.traceId === 'string' ? payload.traceId : null)
    : consumeOrCreateTraceId(typeof payload.traceId === 'string' ? payload.traceId : null);

  const spanContext = options?.beginSpan
    ? beginClientSpan(traceId, typeof payload.parentSpanId === 'string' ? payload.parentSpanId : undefined)
    : {
        traceId,
        spanId: typeof payload.spanId === 'string' ? payload.spanId : getActiveSpanId(),
        parentSpanId: typeof payload.parentSpanId === 'string' ? payload.parentSpanId : null,
      };

  const body = JSON.stringify({
    status: 'SUCCESS',
    source: 'CLIENT',
    ...payload,
    sessionId,
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    parentSpanId: spanContext.parentSpanId,
    correlationId: spanContext.traceId,
    url: window.location.href,
    route: window.location.pathname,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/events', blob);
    return;
  }

  void fetch('/api/events', {
    method: 'POST',
    headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, spanContext.traceId, spanContext.spanId || undefined, spanContext.parentSpanId || undefined),
    body,
    keepalive: true,
    cache: 'no-store'
  }).catch(() => null);
}
