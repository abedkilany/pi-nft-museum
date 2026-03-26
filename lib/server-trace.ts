import 'server-only';
import { AsyncLocalStorage } from 'async_hooks';
import { trackAppEvent } from '@/lib/app-events';
import { generateRequestId, generateSpanId, getRequestContextFromHeaders } from '@/lib/request-context';

type TraceStatus = 'STARTED' | 'SUCCESS' | 'FAILED' | 'WARNING';

type ServerTraceContext = {
  traceId: string;
  requestId: string;
  sessionId: string | null;
  spanId: string;
  parentSpanId: string | null;
  route: string | null;
  method: string | null;
  feature: string | null;
  source: 'SERVER';
};

type RequestTraceOptions = {
  route?: string | null;
  method?: string | null;
  feature?: string | null;
  name?: string | null;
};

type SpanOptions = {
  name: string;
  eventKey?: string | null;
  type?: string | null;
  category?: string | null;
  feature?: string | null;
  route?: string | null;
  method?: string | null;
  data?: Record<string, unknown> | null;
  entityType?: string | null;
  entityId?: string | number | null;
};

const storage = new AsyncLocalStorage<ServerTraceContext>();

function normalizeStatusCode(value: unknown) {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

export function getServerTraceContext() {
  return storage.getStore() || null;
}

export function getServerTraceMeta(extra?: Record<string, unknown>) {
  const ctx = getServerTraceContext();
  return {
    feature: ctx?.feature || null,
    route: ctx?.route || null,
    method: ctx?.method || null,
    traceId: ctx?.traceId || null,
    requestId: ctx?.requestId || null,
    sessionId: ctx?.sessionId || null,
    spanId: ctx?.spanId || null,
    parentSpanId: ctx?.parentSpanId || null,
    source: 'SERVER',
    ...(extra || {}),
  };
}

async function recordSpanEvent(
  ctx: ServerTraceContext,
  options: SpanOptions,
  status: TraceStatus,
  extra?: {
    durationMs?: number | null;
    message?: string | null;
    errorName?: string | null;
    errorCode?: string | null;
    errorStack?: string | null;
    httpStatus?: number | null;
    data?: Record<string, unknown> | null;
    spanId?: string;
    parentSpanId?: string | null;
  }
) {
  await trackAppEvent({
    eventKey: options.eventKey || options.name,
    category: options.category || 'TRACE',
    type: options.type || 'SPAN',
    name: options.name,
    status,
    severity: status === 'FAILED' ? 'HIGH' : status === 'WARNING' ? 'MEDIUM' : null,
    isHealthy: status !== 'FAILED' && status !== 'WARNING',
    message: extra?.message || null,
    readableSummary: options.name,
    source: ctx.source,
    feature: options.feature || ctx.feature,
    route: options.route || ctx.route,
    method: options.method || ctx.method,
    sessionId: ctx.sessionId,
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    spanId: extra?.spanId || ctx.spanId,
    parentSpanId: extra?.parentSpanId === undefined ? ctx.parentSpanId : extra.parentSpanId,
    correlationId: ctx.traceId,
    entityType: options.entityType || null,
    entityId: options.entityId ?? null,
    httpStatus: normalizeStatusCode(extra?.httpStatus),
    durationMs: extra?.durationMs ?? null,
    errorName: extra?.errorName || null,
    errorCode: extra?.errorCode || null,
    errorStack: extra?.errorStack || null,
    data: {
      ...(options.data || {}),
      ...(extra?.data || {}),
    }
  });
}

export async function runWithServerRequestTrace<T>(
  request: Request,
  options: RequestTraceOptions,
  fn: (ctx: ServerTraceContext) => Promise<T>
): Promise<T> {
  const incoming = getRequestContextFromHeaders(request.headers);
  const traceId = incoming.traceId || generateRequestId();
  const spanId = incoming.spanId || generateSpanId();
  const ctx: ServerTraceContext = {
    traceId,
    requestId: incoming.requestId || generateRequestId(),
    sessionId: incoming.sessionId,
    spanId,
    parentSpanId: incoming.parentSpanId,
    route: options.route || null,
    method: options.method || request.method || null,
    feature: options.feature || null,
    source: 'SERVER',
  };

  return storage.run(ctx, async () => {
    const startedAt = Date.now();
    await recordSpanEvent(ctx, {
      name: options.name || `${ctx.method || 'REQUEST'} ${ctx.route || 'request'}`,
      eventKey: 'SERVER_REQUEST',
      type: 'REQUEST',
      category: 'TRACE',
      feature: ctx.feature,
      route: ctx.route,
      method: ctx.method,
      data: { phase: 'request', lifecycle: 'start' }
    }, 'STARTED');

    try {
      const result = await fn(ctx);
      const durationMs = Date.now() - startedAt;
      const responseStatus = typeof Response !== 'undefined' && result instanceof Response ? result.status : null;
      await recordSpanEvent(ctx, {
        name: options.name || `${ctx.method || 'REQUEST'} ${ctx.route || 'request'}`,
        eventKey: 'SERVER_REQUEST',
        type: 'REQUEST',
        category: 'TRACE',
        feature: ctx.feature,
        route: ctx.route,
        method: ctx.method,
        data: { phase: 'request', lifecycle: 'complete' }
      }, responseStatus && responseStatus >= 400 ? 'FAILED' : 'SUCCESS', {
        durationMs,
        httpStatus: responseStatus,
      });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      await recordSpanEvent(ctx, {
        name: options.name || `${ctx.method || 'REQUEST'} ${ctx.route || 'request'}`,
        eventKey: 'SERVER_REQUEST',
        type: 'REQUEST',
        category: 'TRACE',
        feature: ctx.feature,
        route: ctx.route,
        method: ctx.method,
        data: { phase: 'request', lifecycle: 'failed' }
      }, 'FAILED', {
        durationMs,
        message: normalizedError.message,
        errorName: normalizedError.name,
        errorStack: normalizedError.stack || null,
      });
      throw error;
    }
  });
}

export async function withServerSpan<T>(options: SpanOptions, fn: () => Promise<T>): Promise<T> {
  const parent = getServerTraceContext();
  if (!parent) {
    return fn();
  }

  const spanId = generateSpanId();
  const ctx: ServerTraceContext = {
    ...parent,
    spanId,
    parentSpanId: parent.spanId,
    route: options.route || parent.route,
    method: options.method || parent.method,
    feature: options.feature || parent.feature,
  };

  return storage.run(ctx, async () => {
    const startedAt = Date.now();
    await recordSpanEvent(parent, options, 'STARTED', {
      spanId,
      parentSpanId: parent.spanId,
      data: { lifecycle: 'start' },
    });

    try {
      const result = await fn();
      await recordSpanEvent(parent, options, 'SUCCESS', {
        spanId,
        parentSpanId: parent.spanId,
        durationMs: Date.now() - startedAt,
        data: { lifecycle: 'complete' },
      });
      return result;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      await recordSpanEvent(parent, options, 'FAILED', {
        spanId,
        parentSpanId: parent.spanId,
        durationMs: Date.now() - startedAt,
        message: normalizedError.message,
        errorName: normalizedError.name,
        errorStack: normalizedError.stack || null,
        data: { lifecycle: 'failed' },
      });
      throw error;
    }
  });
}
