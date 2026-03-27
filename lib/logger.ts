import * as Sentry from '@sentry/nextjs';
import { classifyEventSeverity, trackAppEvent, sanitizeEventValue, normalizeRoutePath } from '@/lib/app-events';
import { appendSystemLog, type SystemLogEntry, type SystemLogLevel } from '@/lib/system-log';
import { mapSeverityFromStatus, normalizeError, recordErrorLog } from '@/lib/error-tracker';

type LogLevel = SystemLogLevel;

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

function inferCategory(record: Record<string, unknown> | null, message: string) {
  const explicit = typeof record?.category === 'string' ? record.category : null;
  if (explicit) return explicit;

  const feature = typeof record?.feature === 'string' ? record.feature.toLowerCase() : '';
  if (feature) return feature;

  const sourceText = `${message} ${typeof record?.eventKey === 'string' ? record.eventKey : ''}`.toLowerCase();
  if (sourceText.includes('auth')) return 'auth';
  if (sourceText.includes('payment')) return 'payments';
  if (sourceText.includes('security')) return 'security';
  if (sourceText.includes('admin')) return 'admin';
  return 'application';
}

function inferCode(record: Record<string, unknown> | null) {
  if (typeof record?.code === 'string' || typeof record?.code === 'number') return String(record.code);
  if (typeof record?.errorCode === 'string' || typeof record?.errorCode === 'number') return String(record.errorCode);
  return null;
}

function inferSeverity(level: LogLevel, status: number | null, category: string | null) {
  if (level === 'error') return mapSeverityFromStatus(status, category);
  if (level === 'warn') return classifyEventSeverity({ failed: true, status, category: category?.toUpperCase() || 'SYSTEM_FLOW' });
  return level === 'debug' ? 'LOW' : null;
}

function extractContext(meta: unknown, message: string) {
  const record = metaRecord(meta);
  const status = typeof record?.httpStatus === 'number' ? record.httpStatus : typeof record?.status === 'number' ? record.status : null;
  const category = inferCategory(record, message);

  return {
    code: inferCode(record),
    category,
    severity: inferSeverity('info', status, category),
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
    source: typeof record?.source === 'string' ? record.source : typeof window === 'undefined' ? 'SERVER' : 'CLIENT',
    httpStatus: status,
  };
}

type NormalizedLoggerError = {
  name: string | null;
  message: string | null;
  stack: string | null;
  digest: string | null;
  code: string | null;
  status: number | null;
};

function isNonErrorStatus(status: number | null) {
  return typeof status === 'number' && status >= 200 && status < 400;
}

function extractErrorCandidate(meta: unknown): unknown {
  if (meta instanceof Error) return meta;
  const record = metaRecord(meta);
  if (!record) return null;

  if (record.error instanceof Error) return record.error;
  if (record.cause instanceof Error) return record.cause;

  const status = typeof record.httpStatus === 'number' ? record.httpStatus : typeof record.status === 'number' ? record.status : null;
  const errorField = record.error;
  const errorFieldText = typeof errorField === 'string' ? errorField.trim() : null;
  const explicitErrorName = typeof record.errorName === 'string' ? record.errorName : null;
  const explicitErrorMessage = typeof record.errorMessage === 'string' ? record.errorMessage : null;
  const explicitErrorStack = typeof record.errorStack === 'string' ? record.errorStack : null;
  const explicitErrorCode = typeof record.errorCode === 'string' || typeof record.errorCode === 'number' ? String(record.errorCode) : null;
  const genericCode = typeof record.code === 'string' || typeof record.code === 'number' ? String(record.code) : null;
  const messageContainsErrorKey = typeof record.message === 'string' && Object.keys(record).some((key) => key.toLowerCase().includes('error'));
  const genericMessage = messageContainsErrorKey ? record.message as string : null;

  const errorLike: NormalizedLoggerError = {
    name: explicitErrorName,
    message: explicitErrorMessage || genericMessage || errorFieldText,
    stack: explicitErrorStack,
    digest: null,
    code: explicitErrorCode || (status != null && status >= 400 ? genericCode : null),
    status,
  };

  const hasExplicitErrorSignal = Boolean(
    explicitErrorName || explicitErrorMessage || explicitErrorStack || explicitErrorCode || (errorFieldText && errorFieldText.toLowerCase() !== 'null')
  );
  const hasFailureStatus = typeof status === 'number' && status >= 400;

  if (!hasExplicitErrorSignal && !hasFailureStatus) return null;
  if (isNonErrorStatus(status) && !hasExplicitErrorSignal) return null;

  return errorLike;
}

function normalizeLoggerErrorCandidate(candidate: unknown): NormalizedLoggerError {
  if (candidate instanceof Error || typeof candidate === 'string') {
    return normalizeError(candidate);
  }

  const record = metaRecord(candidate);
  if (record) {
    return {
      name: typeof record.name === 'string' ? record.name : null,
      message: typeof record.message === 'string' ? record.message : null,
      stack: typeof record.stack === 'string' ? record.stack : null,
      digest: typeof record.digest === 'string' ? record.digest : null,
      code: typeof record.code === 'string' ? record.code : null,
      status: typeof record.status === 'number' ? record.status : null,
    };
  }

  return { name: null, message: null, stack: null, digest: null, code: null, status: null };
}

function buildSystemLogEntry(level: LogLevel, message: string, meta?: unknown): SystemLogEntry {
  const sanitizedMeta = sanitizeMeta(meta);
  const context = extractContext(sanitizedMeta, message);
  const errorCandidate = extractErrorCandidate(meta);
  const normalized = level === 'error'
    ? normalizeLoggerErrorCandidate(errorCandidate ?? meta ?? message)
    : errorCandidate
      ? normalizeLoggerErrorCandidate(errorCandidate)
      : { name: null, message: null, stack: null, digest: null, code: null, status: context.httpStatus };

  const category = context.category;

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    code: normalized.code || context.code,
    category,
    severity: inferSeverity(level, normalized.status ?? context.httpStatus, category),
    source: context.source,
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
    httpStatus: normalized.status ?? context.httpStatus,
    meta: sanitizedMeta,
  };
}

async function persistIfNeeded(level: LogLevel, message: string, entry: SystemLogEntry) {
  let sentryEventId: string | null = null;
  const errorCandidate = extractErrorCandidate(entry.meta);
  const normalized = level === 'error'
    ? normalizeLoggerErrorCandidate(errorCandidate ?? entry.meta ?? message)
    : errorCandidate
      ? normalizeLoggerErrorCandidate(errorCandidate)
      : { name: null, message: null, stack: null, digest: null, code: null, status: entry.httpStatus ?? null };

  const sanitizedMeta = entry.meta && typeof entry.meta === 'object' ? (entry.meta as Record<string, unknown>) : { meta: entry.meta };

  try {
    if (level === 'error') {
      sentryEventId = Sentry.captureException(errorCandidate instanceof Error ? errorCandidate : new Error(message), {
        tags: { source: 'logger', log_level: level, category: entry.category || 'application' },
        extra: sanitizedMeta
      });
    } else if (level === 'warn') {
      Sentry.captureMessage(message, { level: 'warning', tags: { source: 'logger', category: entry.category || 'application' } });
    }
  } catch {}

  if (level !== 'debug') {
    await trackAppEvent({
      category: level === 'error' ? 'ERROR' : 'SYSTEM_FLOW',
      type: level === 'warn' || level === 'error' ? 'LOGGER' : 'SYSTEM_EVENT',
      eventKey: `LOGGER_${level.toUpperCase()}`,
      name: message,
      status: level === 'error' ? 'FAILED' : level === 'warn' ? 'WARNING' : 'SUCCESS',
      severity: entry.severity,
      isHealthy: level === 'info',
      message,
      readableSummary: message,
      source: entry.source,
      feature: entry.feature,
      route: entry.route,
      method: entry.method,
      url: entry.url,
      component: entry.component,
      userId: entry.userId,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      traceId: entry.traceId,
      correlationId: entry.correlationId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      errorName: normalized.name,
      errorCode: normalized.code || entry.code,
      errorStack: normalized.stack,
      httpStatus: normalized.status ?? entry.httpStatus,
      data: sanitizedMeta,
      tags: sentryEventId ? { sentryEventId } : undefined
    });
  }

  if (level !== 'warn' && level !== 'error') return;

  try {
    await recordErrorLog({
      title: message,
      message: normalized.message || message,
      severity: level === 'error' ? mapSeverityFromStatus(normalized.status ?? entry.httpStatus, entry.category) : 'LOW',
      source: entry.source === 'CLIENT' ? 'CLIENT' : entry.source === 'MIDDLEWARE' ? 'MIDDLEWARE' : 'SERVER',
      runtime: typeof window === 'undefined' ? 'nodejs' : 'browser',
      category: entry.category,
      isOperational: true,
      route: entry.route,
      method: entry.method,
      url: entry.url,
      errorName: normalized.name,
      stack: normalized.stack,
      digest: normalized.digest,
      code: normalized.code || entry.code,
      httpStatus: normalized.status ?? entry.httpStatus,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      traceId: entry.traceId,
      correlationId: entry.correlationId,
      sentryEventId,
      extra: sanitizedMeta,
      userId: entry.userId,
    });
  } catch (error) {
    console.error('Failed to persist error log', error);
  }
}

async function write(level: LogLevel, message: string, meta?: unknown) {
  const entry = buildSystemLogEntry(level, message, meta);

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

  await persistIfNeeded(level, message, entry);
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
