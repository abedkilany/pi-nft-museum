import * as Sentry from '@sentry/nextjs';
import { trackAppEvent, sanitizeEventValue } from '@/lib/app-events';
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

function buildEntry(level: LogLevel, message: string, meta?: unknown) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta: sanitizeMeta(meta)
  };
}

async function persistIfNeeded(level: LogLevel, message: string, meta?: unknown) {
  let sentryEventId: string | null = null;
  const normalized = normalizeError(meta ?? message);
  const sanitizedMeta = meta && typeof meta === 'object' ? (sanitizeMeta(meta) as Record<string, unknown>) : { meta: sanitizeMeta(meta) };

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

  await trackAppEvent({
    category: level === 'error' ? 'ERROR' : 'SYSTEM_FLOW',
    type: 'LOGGER',
    name: `LOGGER_${level.toUpperCase()}`,
    status: level === 'error' ? 'FAILED' : level === 'warn' ? 'WARNING' : 'SUCCESS',
    severity: level === 'error' ? mapSeverityFromStatus(normalized.status) : level === 'warn' ? 'LOW' : null,
    isHealthy: level === 'debug' || level === 'info',
    message,
    readableSummary: message,
    source: typeof window === 'undefined' ? 'SERVER' : 'CLIENT',
    errorName: normalized.name,
    errorCode: normalized.code,
    errorStack: normalized.stack,
    httpStatus: normalized.status,
    data: sanitizedMeta,
    tags: sentryEventId ? { sentryEventId } : undefined
  });

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
