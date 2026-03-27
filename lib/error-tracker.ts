import crypto from 'crypto';
import { Prisma, ErrorSeverity, ErrorSource, ErrorStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ErrorLogInput = {
  title: string;
  message: string;
  readableSummary?: string | null;
  severity?: ErrorSeverity;
  status?: ErrorStatus;
  source?: ErrorSource;
  runtime?: string | null;
  category?: string | null;
  isOperational?: boolean | null;
  route?: string | null;
  method?: string | null;
  url?: string | null;
  digest?: string | null;
  errorName?: string | null;
  stack?: string | null;
  componentStack?: string | null;
  code?: string | null;
  httpStatus?: number | null;
  release?: string | null;
  environment?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  sentryEventId?: string | null;
  sentryIssueUrl?: string | null;
  tags?: Record<string, unknown> | null;
  extra?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  userId?: number | null;
};

type Serializable = Prisma.InputJsonValue | undefined;

const redactedKeys = new Set([
  'password',
  'token',
  'authorization',
  'secret',
  'cookie',
  'set-cookie',
  'accessToken',
  'refreshToken',
  'pinata_jwt',
  'pi_server_api_key',
  'auth_secret'
]);

function redact(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null
    };
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, innerValue]) => {
        if (redactedKeys.has(key) || redactedKeys.has(key.toLowerCase())) {
          return [key, '[redacted]'];
        }
        return [key, redact(innerValue)];
      })
    );
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value ?? null;
}

function asJson(value: unknown): Serializable {
  const redacted = redact(value);
  if (redacted === undefined) return undefined;
  return redacted as Prisma.InputJsonValue;
}

function compactText(value: string | null | undefined, limit = 4000) {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
}

function summarize(input: ErrorLogInput) {
  const area = input.route || input.url || 'unknown area';
  const action = input.method ? `${input.method} ${area}` : area;
  const level =
    input.severity === 'CRITICAL'
      ? 'Critical'
      : input.severity === 'HIGH'
      ? 'High priority'
      : input.severity === 'LOW'
      ? 'Low priority'
      : 'Medium priority';

  return `${level} ${String(input.source || 'UNKNOWN').toLowerCase()} issue in ${action}: ${input.message}`;
}

function buildFingerprint(input: ErrorLogInput) {
  const raw = [
    input.source ?? 'UNKNOWN',
    input.route ?? input.url ?? '',
    input.method ?? '',
    input.errorName ?? '',
    input.code ?? '',
    input.digest ?? '',
    input.message
  ].join('::');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function recordErrorLog(input: ErrorLogInput) {
  const now = new Date();
  const fingerprint = buildFingerprint(input);

  const data = {
    title: compactText(input.title, 180) ?? 'Application error',
    message: compactText(input.message, 6000) ?? 'Unknown error',
    readableSummary: compactText(input.readableSummary ?? summarize(input), 2500),
    severity: input.severity ?? 'MEDIUM',
    status: input.status ?? 'OPEN',
    source: input.source ?? 'UNKNOWN',
    runtime: compactText(input.runtime, 120),
    category: compactText(input.category, 120),
    isOperational: input.isOperational ?? true,
    route: compactText(input.route, 512),
    method: compactText(input.method, 32),
    url: compactText(input.url, 2000),
    digest: compactText(input.digest, 180),
    errorName: compactText(input.errorName, 180),
    stack: compactText(input.stack, 20000),
    componentStack: compactText(input.componentStack, 20000),
    code: compactText(input.code, 120),
    httpStatus: input.httpStatus ?? null,
    release: compactText(input.release ?? process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA, 180),
    environment: compactText(input.environment ?? process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV, 80),
    userAgent: compactText(input.userAgent, 4000),
    ipAddress: compactText(input.ipAddress, 180),
    sessionId: compactText(input.sessionId, 180),
    requestId: compactText(input.requestId, 180),
    traceId: compactText(input.traceId, 180),
    correlationId: compactText(input.correlationId, 180),
    sentryEventId: compactText(input.sentryEventId, 180),
    sentryIssueUrl: compactText(input.sentryIssueUrl, 2000),
    tagsJson: asJson(input.tags ?? null),
    extraJson: asJson(input.extra ?? null),
    lastPayloadJson: asJson(input.payload ?? null),
    userId: input.userId ?? null,
    lastSeenAt: now
  };

  const existing = await prisma.errorLog.findUnique({ where: { fingerprint } }).catch(() => null);

  if (!existing) {
    return prisma.errorLog.create({
      data: {
        fingerprint,
        firstSeenAt: now,
        occurrenceCount: 1,
        ...data
      }
    });
  }

  return prisma.errorLog.update({
    where: { fingerprint },
    data: {
      occurrenceCount: { increment: 1 },
      lastSeenAt: now,
      title: data.title,
      message: data.message,
      readableSummary: data.readableSummary,
      severity: data.severity,
      source: data.source,
      runtime: data.runtime,
      category: data.category,
      isOperational: data.isOperational,
      route: data.route,
      method: data.method,
      url: data.url,
      digest: data.digest,
      errorName: data.errorName,
      stack: data.stack,
      componentStack: data.componentStack,
      code: data.code,
      httpStatus: data.httpStatus,
      release: data.release,
      environment: data.environment,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      sessionId: data.sessionId,
      requestId: data.requestId,
      traceId: data.traceId,
      correlationId: data.correlationId,
      sentryEventId: data.sentryEventId,
      sentryIssueUrl: data.sentryIssueUrl,
      tagsJson: data.tagsJson,
      extraJson: data.extraJson,
      lastPayloadJson: data.lastPayloadJson,
      userId: data.userId,
      status: existing.status === 'RESOLVED' ? 'OPEN' : existing.status,
      resolvedAt: existing.status === 'RESOLVED' ? null : existing.resolvedAt
    }
  });
}

export function normalizeError(error: unknown) {
  if (error instanceof Error) {
    const anyError = error as Error & { digest?: string; code?: string | number; status?: number };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      digest: anyError.digest ? String(anyError.digest) : null,
      code: anyError.code ? String(anyError.code) : null,
      status: typeof anyError.status === 'number' ? anyError.status : null
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: null,
      digest: null,
      code: null,
      status: null
    };
  }

  return {
    name: 'UnknownError',
    message: 'Unknown error',
    stack: null,
    digest: null,
    code: null,
    status: null,
    payload: redact(error)
  };
}

export function mapSeverityFromStatus(status?: number | null, category?: string | null): ErrorSeverity {
  const normalizedCategory = String(category || '').toLowerCase();
  if (normalizedCategory === 'security') return 'HIGH';
  if (normalizedCategory === 'payments') return 'HIGH';
  if (!status) return 'MEDIUM';
  if (status >= 500) return 'HIGH';
  if (status === 429) return 'LOW';
  if (status === 401 || status === 403) return normalizedCategory === 'security' ? 'HIGH' : 'MEDIUM';
  if (status >= 400) return 'MEDIUM';
  return 'LOW';
}

export function toCsvValue(value: unknown) {
  const text =
    value == null
      ? ''
      : typeof value === 'string'
      ? value
      : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}
