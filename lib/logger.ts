import * as Sentry from '@sentry/nextjs';
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
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack || null
    };
  }

  if (Array.isArray(meta)) {
    return meta.map(sanitizeMeta);
  }

  if (meta && typeof meta === 'object') {
    return Object.fromEntries(
      Object.entries(meta as Record<string, unknown>).map(([key, value]) => {
        const lowered = key.toLowerCase();
        if (['password', 'token', 'authorization', 'secret', 'cookie', 'set-cookie', 'accesstoken'].includes(lowered)) {
          return [key, '[redacted]'];
        }
        return [key, sanitizeMeta(value)];
      })
    );
  }

  return meta ?? null;
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
  if (level !== 'warn' && level !== 'error') return;

  let sentryEventId: string | null = null;
  try {
    if (level === 'error') {
      sentryEventId = Sentry.captureException(meta instanceof Error ? meta : new Error(message), {
        tags: { source: 'logger', log_level: level },
        extra: meta && typeof meta === 'object' ? (sanitizeMeta(meta) as Record<string, unknown>) : { meta: sanitizeMeta(meta) }
      });
    } else {
      Sentry.captureMessage(message, { level: 'warning', tags: { source: 'logger' } });
    }
  } catch {}

  const normalized = normalizeError(meta ?? message);

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
      extra: meta && typeof meta === 'object' ? (sanitizeMeta(meta) as Record<string, unknown>) : { meta: sanitizeMeta(meta) }
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
