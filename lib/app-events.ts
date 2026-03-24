import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AppEventInput = {
  eventKey?: string | null;
  category: string;
  type: string;
  name: string;
  status: 'STARTED' | 'SUCCESS' | 'WARNING' | 'FAILED' | string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string | null;
  isHealthy?: boolean;
  message?: string | null;
  readableSummary?: string | null;
  source?: string | null;
  feature?: string | null;
  route?: string | null;
  method?: string | null;
  url?: string | null;
  component?: string | null;
  userId?: number | null;
  sessionId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  correlationId?: string | null;
  entityType?: string | null;
  entityId?: string | number | null;
  parentType?: string | null;
  parentId?: string | number | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  errorName?: string | null;
  errorCode?: string | null;
  errorStack?: string | null;
  fingerprint?: string | null;
  tags?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
};

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

const NOISY_EVENT_NAMES = new Set([
  'PAGE_VIEWED',
  'BUTTON_CLICKED',
  'LINK_CLICKED',
  'IMAGE_CLICKED',
  'FORM_SUBMITTED',
  'AUTH_ME_START',
  'AUTH_ME_CONFIRMED',
  'PI_CONNECT_BUTTON_AUTH_ATTEMPT',
  'PI_CONNECT_BUTTON_AUTH_RESOLVED',
  'POST_AUTH_REDIRECT_START',
]);

export function sanitizeEventValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? null
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeEventValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, innerValue]) => {
        if (redactedKeys.has(key) || redactedKeys.has(key.toLowerCase())) {
          return [key, '[redacted]'];
        }
        return [key, sanitizeEventValue(innerValue)];
      })
    );
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value ?? null;
}

function asJson(value: unknown) {
  const sanitized = sanitizeEventValue(value);
  if (sanitized === undefined) return undefined;
  return sanitized as Prisma.InputJsonValue;
}

function shouldPersistEvent(input: AppEventInput) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return true;

  const status = String(input.status || '').toUpperCase();
  const severity = String(input.severity || '').toUpperCase();
  const category = String(input.category || '').toUpperCase();
  const name = String(input.name || input.eventKey || '').toUpperCase();
  const feature = String(input.feature || '').toLowerCase();

  if (status === 'FAILED' || status === 'WARNING') return true;
  if (severity === 'HIGH' || severity === 'CRITICAL') return true;
  if (category === 'ERROR' || category === 'AUDIT') return true;
  if (feature === 'admin' || feature === 'security' || feature === 'payments') return true;
  if (NOISY_EVENT_NAMES.has(name)) return false;
  return false;
}

export function normalizeRoutePath(route: string | null | undefined, url?: string | null | undefined) {
  const candidate = route || url || null;
  if (!candidate) return null;
  const value = String(candidate).trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    return value.split('?')[0] || '/';
  }

  try {
    const parsed = new URL(value);
    return parsed.pathname || '/';
  } catch {
    const withoutOrigin = value.replace(/^https?:\/\/[^/]+/i, '');
    if (!withoutOrigin) return '/';
    return withoutOrigin.startsWith('/') ? withoutOrigin.split('?')[0] || '/' : `/${withoutOrigin.split('?')[0]}`;
  }
}

function compactText(value: string | null | undefined, limit = 4000) {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
}

function inferFeature(input: AppEventInput) {
  if (input.feature) return input.feature;
  const sourceText = `${input.eventKey || ''} ${input.name || ''} ${input.message || ''}`.toUpperCase();
  if (sourceText.includes('PI_') || sourceText.includes('AUTH')) return 'auth';
  if (sourceText.includes('PAYMENT')) return 'payments';
  if (sourceText.includes('UPLOAD')) return 'uploads';
  if (sourceText.includes('ADMIN')) return 'admin';
  if (sourceText.includes('COMMENT')) return 'comments';
  if (sourceText.includes('ARTWORK')) return 'artwork';
  if (sourceText.includes('SECURITY')) return 'security';
  const normalizedRoute = normalizeRoutePath(input.route, input.url);
  if (normalizedRoute?.startsWith('/admin')) return 'admin';
  if (normalizedRoute?.startsWith('/account')) return 'account';
  if (normalizedRoute === '/' || normalizedRoute?.startsWith('/gallery')) return 'navigation';
  return 'general';
}

function inferStep(input: AppEventInput) {
  const sourceText = `${input.eventKey || ''} ${input.name || ''} ${input.message || ''}`.toUpperCase();
  if (sourceText.includes('BUTTON')) return 'interaction';
  if (sourceText.includes('FLOW_START')) return 'flow_start';
  if (sourceText.includes('SDK_START')) return 'sdk_start';
  if (sourceText.includes('SDK_SUCCESS')) return 'sdk_success';
  if (sourceText.includes('SERVER_LOGIN_START')) return 'server_login_start';
  if (sourceText.includes('SESSION_TOKEN_STORED')) return 'session_token_stored';
  if (sourceText.includes('ME_REQUEST_START')) return 'session_restore_start';
  if (sourceText.includes('ME_REQUEST_SUCCESS')) return 'session_restore_success';
  if (sourceText.includes('SESSION_ISSUED')) return 'session_issued';
  if (sourceText.includes('LOGIN_SUCCESS') || sourceText.includes('FLOW_AUTHENTICATED')) return 'completed';
  if (sourceText.includes('ERROR') || sourceText.includes('FAILED')) return 'failed';
  return null;
}

function buildFingerprint(input: AppEventInput) {
  const raw = [
    input.category,
    input.type,
    input.name,
    input.status,
    input.source ?? 'UNKNOWN',
    input.route ?? input.url ?? '',
    input.method ?? '',
    input.errorName ?? '',
    input.errorCode ?? '',
    input.message ?? ''
  ].join('::');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function trackAppEvent(input: AppEventInput) {
  try {
    if (!shouldPersistEvent(input)) return;

    const feature = inferFeature(input);
    const step = inferStep(input);
    const tags = {
      ...(input.tags || {}),
      ...(step ? { step } : {}),
      anomaly: input.status === 'FAILED' || input.status === 'WARNING'
    } as Record<string, unknown>;

    await prisma.appEvent.create({
      data: {
        eventKey: compactText(input.eventKey || input.name, 180) || 'APP_EVENT',
        category: compactText(input.category, 80) || 'SYSTEM_FLOW',
        type: compactText(input.type, 80) || 'UNKNOWN',
        name: compactText(input.name, 180) || 'APP_EVENT',
        status: compactText(input.status, 40) || 'SUCCESS',
        severity: compactText(input.severity || null, 32),
        isHealthy: input.isHealthy ?? (input.status !== 'FAILED' && input.status !== 'WARNING'),
        message: compactText(input.message, 6000),
        readableSummary: compactText(input.readableSummary, 2000),
        source: compactText(input.source, 60),
        feature: compactText(feature, 120),
        route: compactText(normalizeRoutePath(input.route, input.url), 512),
        method: compactText(input.method, 32),
        url: compactText(input.url, 2000),
        component: compactText(input.component, 180),
        userId: input.userId ?? null,
        sessionId: compactText(input.sessionId, 180),
        requestId: compactText(input.requestId, 180),
        traceId: compactText(input.traceId, 180),
        correlationId: compactText(input.correlationId, 180),
        entityType: compactText(input.entityType, 120),
        entityId: input.entityId == null ? null : compactText(String(input.entityId), 180),
        parentType: compactText(input.parentType, 120),
        parentId: input.parentId == null ? null : compactText(String(input.parentId), 180),
        httpStatus: input.httpStatus ?? null,
        durationMs: input.durationMs ?? null,
        errorName: compactText(input.errorName, 180),
        errorCode: compactText(input.errorCode, 120),
        errorStack: compactText(input.errorStack, 20000),
        fingerprint: compactText(input.fingerprint || buildFingerprint(input), 180),
        tagsJson: asJson(tags),
        dataJson: asJson(input.data ?? null)
      }
    });
  } catch {}
}

export async function cleanupObservabilityEvents() {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  const [lowValue, mediumValue, oldAudit] = await Promise.all([
    prisma.appEvent.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        status: { in: ['STARTED', 'SUCCESS'] },
        category: { notIn: ['ERROR', 'AUDIT'] },
        name: { in: Array.from(NOISY_EVENT_NAMES) },
      },
    }),
    prisma.appEvent.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { notIn: ['FAILED', 'WARNING'] },
        OR: [
          { severity: null },
          { severity: { notIn: ['HIGH', 'CRITICAL'] } },
        ],
        category: { not: 'AUDIT' },
      },
    }),
    prisma.appEvent.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        category: 'AUDIT',
      },
    }),
  ]);

  return {
    lowValueDeleted: lowValue.count,
    mediumValueDeleted: mediumValue.count,
    oldAuditDeleted: oldAudit.count,
    totalDeleted: lowValue.count + mediumValue.count + oldAudit.count,
  };
}

export function isAppEventTableMissingError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code === 'P2021') return true;
  const message = String(maybe.message || '');
  return message.includes('AppEvent') && message.includes('does not exist');
}

export async function safeAppEventQuery<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isAppEventTableMissingError(error)) {
      return fallback;
    }
    throw error;
  }
}

export function classifyEventSeverity(input: { status?: number | null; failed?: boolean; category?: string | null }) {
  if (input.category === 'SECURITY') return 'HIGH';
  if (input.status && input.status >= 500) return 'HIGH';
  if (input.status && input.status >= 400) return 'MEDIUM';
  if (input.failed) return 'MEDIUM';
  return 'LOW';
}
