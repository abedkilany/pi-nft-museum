import * as Sentry from '@sentry/nextjs';
import { classifyEventSeverity, trackAppEvent, sanitizeEventValue, normalizeRoutePath } from '@/lib/app-events';
import { appendSystemLog } from '@/lib/system-log';
import { mapSeverityFromStatus, normalizeError, recordErrorLog } from '@/lib/error-tracker';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDebug = process.env.APP_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
const logLevel = (process.env.LOG_LEVEL || 'debug') as LogLevel;

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[logLevel];
}

function sanitizeMeta(meta: unknown): unknown {
  return sanitizeEventValue(meta);
}


function metaRecord(meta: unknown) {
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as Record<string, unknown>) : null;
}

function extractContext(meta: unknown) {
  const record = metaRecord(meta);
  return {
    feature: typeof record?.feature === 'string' ? record.feature : null,
    route: normalizeRoutePath(typeof record?.route === 'string' ? record.route : null, typeof record?.url === 'string' ? record.url : null),
    method: typeof record?.method === 'string' ? record.method : null,
    url: typeof record?.url === 'string' ? record.url : null,
    component: typeof record?.component === 'string' ? record.component : null,
    sessionId: typeof record?.sessionId === 'string' ? record.sessionId : null,
    requestId: typeof record?.requestId === 'string' ? record.requestId : null,
    traceId: typeof record?.traceId === 'string' ? record.traceId : null,
    correlationId: typeof record?.correlationId === 'string'
      ? record.correlationId
      : typeof record?.traceId === 'string'
        ? record.traceId
        : null,
    entityType: typeof record?.entityType === 'string' ? record.entityType : null,
    entityId: typeof record?.entityId === 'string' || typeof record?.entityId === 'number' ? String(record.entityId) : null,
    userId: typeof record?.userId === 'number' ? record.userId : null,
  };
}

function buildEntry(level: LogLevel, message: string, meta?: unknown) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: sanitizeMeta(meta)
  };
}

function extractErrorCandidate(meta: unknown): unknown {
  if (meta instanceof Error) return meta;
  const record = metaRecord(meta);
  if (!record) return null;

  if (record.error instanceof Error) return record.error;
  if (record.cause instanceof Error) return record.cause;

  const errorLike = {
    name: typeof record.errorName === 'string' ? record.errorName : typeof record.name === 'string' ? record.name : null,
    message: typeof record.errorMessage === 'string'
      ? record.errorMessage
      : typeof record.message === 'string' && Object.keys(record).some((key) => key.toLowerCase().includes('error'))
        ? record.message
        : null,
    stack: typeof record.errorStack === 'string' ? record.errorStack : typeof record.stack === 'string' ? record.stack : null,
    code: typeof record.errorCode === 'string' || typeof record.errorCode === 'number'
      ? String(record.errorCode)
      : typeof record.code === 'string' || typeof record.code === 'number'
        ? String(record.code)
        : null,
    status: typeof record.httpStatus === 'number' ? record.httpStatus : typeof record.status === 'number' ? record.status : null,
  };

  const hasErrorSignal = Boolean(
    errorLike.name || errorLike.message || errorLike.stack || errorLike.code || errorLike.status || record.error
  );

  if (!hasErrorSignal) return null;

  return errorLike;
}

function emptyNormalizedError() {
  return {
    name: null,
    message: null,
    stack: null,
    digest: null,
    code: null,
    status: null,
  };
}

async function persistIfNeeded(level: LogLevel, message: string, meta?: unknown) {
  let sentryEventId: string | null = null;
  const errorCandidate = extractErrorCandidate(meta);
  const normalized = level === 'error'
    ? normalizeError(errorCandidate ?? meta ?? message)
    : errorCandidate
      ? normalizeError(errorCandidate)
      : emptyNormalizedError();
  const sanitizedMeta = meta && typeof meta === 'object' ? (sanitizeMeta(meta) as Record<string, unknown>) : { meta: sanitizeMeta(meta) };
  const context = extractContext(sanitizedMeta);

  try {
    if (level === 'error') {
      sentryEventId = Sentry.captureException(meta instanceof Error ? meta : new Error(message), {
        tags: { source: 'logger', log_level: level },
        extra: sanitizedMeta
      });
    } else if (level === 'warn') {
      Sentry.captureMessage(message, { level: 'warning', tags: { source: 'logger' } });
    }
  } catch {}

  if (level !== 'debug') {
    await trackAppEvent({
      category: level === 'error' ? 'ERROR' : 'SYSTEM_FLOW',
      type: level === 'warn' || level === 'error' ? 'LOGGER' : 'SYSTEM_EVENT',
      eventKey: `LOGGER_${level.toUpperCase()}`,
      name: message,
      status: level === 'error' ? 'FAILED' : level === 'warn' ? 'WARNING' : 'SUCCESS',
      severity: level === 'error'
        ? mapSeverityFromStatus(normalized.status)
        : level === 'warn'
          ? classifyEventSeverity({ failed: true, status: normalized.status, category: context.feature === 'security' ? 'SECURITY' : 'SYSTEM_FLOW' })
          : null,
      isHealthy: level === 'info',
      message,
      readableSummary: message,
      source: typeof window === 'undefined' ? 'SERVER' : 'CLIENT',
      feature: context.feature,
      route: context.route,
      method: context.method,
      url: context.url,
      component: context.component,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      traceId: context.traceId,
      correlationId: context.correlationId,
      entityType: context.entityType,
      entityId: context.entityId,
      errorName: normalized.name,
      errorCode: normalized.code,
      errorStack: normalized.stack,
      httpStatus: normalized.status,
      data: sanitizedMeta,
      tags: sentryEventId ? { sentryEventId } : undefined
    });
  }

  if (level !== 'warn' && level !== 'error') return;

  try {
    await recordErrorLog({
      title: message,
      message: normalized.message || message,
      severity: level === 'error' ? mapSeverityFromStatus(normalized.status) : 'LOW',
      source: 'SERVER',
      runtime: typeof window === 'undefined' ? 'nodejs' : 'browser',
      errorName: normalized.name,
      stack: normalized.stack,
      digest: normalized.digest,
      code: normalized.code,
      httpStatus: normalized.status,
      sentryEventId,
      extra: sanitizedMeta
    });
  } catch (error) {
    console.error('Failed to persist error log', error);
  }
}

async function write(level: LogLevel, message: string, meta?: unknown) {
  const entry = buildEntry(level, message, meta);
  if (level === 'debug') {
    console.debug(entry);
  } else if (level === 'info') {
    console.info(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  } else {
    console.error(entry);
  }

  if (level !== 'debug' || isDebug) {
    try {
      await appendSystemLog(entry);
    } catch (error) {
      console.error('Failed to persist system log', error);
    }
  }

  await persistIfNeeded(level, message, meta);
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!isDebug || !shouldLog('debug')) return;
    void write('debug', message, meta);
  },
  info(message: string, meta?: unknown) {
    if (!shouldLog('info')) return;
    void write('info', message, meta);
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog('warn')) return;
    void write('warn', message, meta);
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog('error')) return;
    void write('error', message, meta);
  }
};
