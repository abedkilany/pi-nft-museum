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

function compactText(value: string | null | undefined, limit = 4000) {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
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
        feature: compactText(input.feature, 120),
        route: compactText(input.route, 512),
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
        tagsJson: asJson(input.tags ?? null),
        dataJson: asJson(input.data ?? null)
      }
    });
  } catch {}
}

export function classifyEventSeverity(input: { status?: number | null; failed?: boolean; category?: string | null }) {
  if (input.category === 'SECURITY') return 'HIGH';
  if (input.status && input.status >= 500) return 'HIGH';
  if (input.status && input.status >= 400) return 'MEDIUM';
  if (input.failed) return 'MEDIUM';
  return 'LOW';
}
