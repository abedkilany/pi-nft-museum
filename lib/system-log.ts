import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sanitizeEventValue, normalizeRoutePath } from '@/lib/app-events';

export type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type SystemLogEntry = {
  timestamp: string;
  level: SystemLogLevel;
  message: string;
  code?: string | null;
  category?: string | null;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string | null;
  source?: 'SERVER' | 'CLIENT' | 'MIDDLEWARE' | 'UNKNOWN' | string | null;
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
  httpStatus?: number | null;
  fingerprint?: string | null;
  meta?: unknown;
};

const SYSTEM_LOG_TARGET_TYPE = 'SYSTEM';
const SYSTEM_LOG_ACTION_PREFIX = 'SYSTEM_LOG_';

function compactText(value: string | null | undefined, limit = 4000) {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
}

function toJson(value: unknown) {
  const sanitized = sanitizeEventValue(value);
  if (sanitized === undefined) return Prisma.JsonNull;
  return sanitized as Prisma.InputJsonValue;
}

function toAuditAction(level: SystemLogLevel) {
  return `${SYSTEM_LOG_ACTION_PREFIX}${level.toUpperCase()}`;
}

function fromAuditAction(action: string): SystemLogLevel {
  const raw = action.replace(SYSTEM_LOG_ACTION_PREFIX, '').toLowerCase();
  return ['debug', 'info', 'warn', 'error'].includes(raw) ? (raw as SystemLogLevel) : 'info';
}

function buildFingerprint(entry: SystemLogEntry) {
  const raw = [
    entry.level,
    entry.code ?? '',
    entry.category ?? '',
    entry.message,
    entry.route ?? entry.url ?? '',
    entry.method ?? '',
    entry.httpStatus ?? '',
    entry.component ?? ''
  ].join('::');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

function normalizeEntry(entry: SystemLogEntry) {
  const route = normalizeRoutePath(entry.route, entry.url);
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    code: compactText(entry.code, 120),
    category: compactText(entry.category || 'application', 120),
    severity: compactText(entry.severity || null, 32),
    source: compactText(entry.source || 'UNKNOWN', 40),
    feature: compactText(entry.feature, 120),
    route: compactText(route, 512),
    method: compactText(entry.method, 32),
    url: compactText(entry.url, 2000),
    component: compactText(entry.component, 180),
    userId: entry.userId ?? null,
    sessionId: compactText(entry.sessionId, 180),
    requestId: compactText(entry.requestId, 180),
    traceId: compactText(entry.traceId, 180),
    correlationId: compactText(entry.correlationId, 180),
    entityType: compactText(entry.entityType, 120),
    entityId: entry.entityId == null ? null : compactText(String(entry.entityId), 180),
    httpStatus: entry.httpStatus ?? null,
    fingerprint: compactText(entry.fingerprint || buildFingerprint(entry), 180),
    dataJson: toJson(entry.meta ?? null),
  };
}

async function appendLegacySystemLog(entry: SystemLogEntry) {
  await prisma.auditLog.create({
    data: {
      action: toAuditAction(entry.level),
      targetType: SYSTEM_LOG_TARGET_TYPE,
      targetId: entry.timestamp,
      newValuesJson: {
        message: entry.message,
        meta: sanitizeEventValue(entry.meta ?? null),
        timestamp: entry.timestamp,
        level: entry.level,
        code: entry.code ?? null,
        category: entry.category ?? null,
        severity: entry.severity ?? null,
        source: entry.source ?? null,
        feature: entry.feature ?? null,
        route: normalizeRoutePath(entry.route, entry.url),
        method: entry.method ?? null,
        url: entry.url ?? null,
        component: entry.component ?? null,
        userId: entry.userId ?? null,
        sessionId: entry.sessionId ?? null,
        requestId: entry.requestId ?? null,
        traceId: entry.traceId ?? null,
        correlationId: entry.correlationId ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId == null ? null : String(entry.entityId),
        httpStatus: entry.httpStatus ?? null,
        fingerprint: entry.fingerprint ?? null,
      } as Prisma.InputJsonValue
    }
  });
}

export async function appendSystemLog(entry: SystemLogEntry) {
  const normalized = normalizeEntry(entry);

  try {
    await prisma.systemLog.create({
      data: {
        timestamp: new Date(entry.timestamp),
        level: normalized.level,
        message: compactText(normalized.message, 6000) || 'System log entry',
        code: normalized.code,
        category: normalized.category,
        severity: normalized.severity,
        source: normalized.source,
        feature: normalized.feature,
        route: normalized.route,
        method: normalized.method,
        url: normalized.url,
        component: normalized.component,
        userId: normalized.userId,
        sessionId: normalized.sessionId,
        requestId: normalized.requestId,
        traceId: normalized.traceId,
        correlationId: normalized.correlationId,
        entityType: normalized.entityType,
        entityId: normalized.entityId,
        httpStatus: normalized.httpStatus,
        fingerprint: normalized.fingerprint,
        dataJson: normalized.dataJson,
      }
    });
    return;
  } catch {
    await appendLegacySystemLog(entry);
  }
}

function mapSystemRow(row: {
  timestamp: Date;
  level: string;
  message: string;
  code: string | null;
  category: string | null;
  severity: string | null;
  source: string | null;
  feature: string | null;
  route: string | null;
  method: string | null;
  url: string | null;
  component: string | null;
  userId: number | null;
  sessionId: string | null;
  requestId: string | null;
  traceId: string | null;
  correlationId: string | null;
  entityType: string | null;
  entityId: string | null;
  httpStatus: number | null;
  fingerprint: string | null;
  dataJson: unknown;
}): SystemLogEntry {
  return {
    timestamp: row.timestamp.toISOString(),
    level: ['debug', 'info', 'warn', 'error'].includes(row.level) ? (row.level as SystemLogLevel) : 'info',
    message: row.message,
    code: row.code,
    category: row.category,
    severity: row.severity,
    source: row.source,
    feature: row.feature,
    route: row.route,
    method: row.method,
    url: row.url,
    component: row.component,
    userId: row.userId,
    sessionId: row.sessionId,
    requestId: row.requestId,
    traceId: row.traceId,
    correlationId: row.correlationId,
    entityType: row.entityType,
    entityId: row.entityId,
    httpStatus: row.httpStatus,
    fingerprint: row.fingerprint,
    meta: row.dataJson,
  };
}

function mapLegacyAuditRow(row: { action: string; createdAt: Date; newValuesJson: unknown }): SystemLogEntry {
  const payload = row.newValuesJson && typeof row.newValuesJson === 'object' && !Array.isArray(row.newValuesJson)
    ? (row.newValuesJson as Record<string, unknown>)
    : {};

  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : row.createdAt.toISOString();
  const message = typeof payload.message === 'string' ? payload.message : row.action;
  const level = typeof payload.level === 'string' && ['debug', 'info', 'warn', 'error'].includes(payload.level)
    ? (payload.level as SystemLogLevel)
    : fromAuditAction(row.action);

  return {
    timestamp,
    level,
    message,
    code: typeof payload.code === 'string' ? payload.code : null,
    category: typeof payload.category === 'string' ? payload.category : null,
    severity: typeof payload.severity === 'string' ? payload.severity : null,
    source: typeof payload.source === 'string' ? payload.source : null,
    feature: typeof payload.feature === 'string' ? payload.feature : null,
    route: typeof payload.route === 'string' ? payload.route : null,
    method: typeof payload.method === 'string' ? payload.method : null,
    url: typeof payload.url === 'string' ? payload.url : null,
    component: typeof payload.component === 'string' ? payload.component : null,
    userId: typeof payload.userId === 'number' ? payload.userId : null,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
    requestId: typeof payload.requestId === 'string' ? payload.requestId : null,
    traceId: typeof payload.traceId === 'string' ? payload.traceId : null,
    correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : null,
    entityType: typeof payload.entityType === 'string' ? payload.entityType : null,
    entityId: typeof payload.entityId === 'string' ? payload.entityId : null,
    httpStatus: typeof payload.httpStatus === 'number' ? payload.httpStatus : null,
    fingerprint: typeof payload.fingerprint === 'string' ? payload.fingerprint : null,
    meta: 'meta' in payload ? payload.meta : null
  };
}

export async function readSystemLogs(limit = 250): Promise<SystemLogEntry[]> {
  try {
    const rows = await prisma.systemLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    if (rows.length > 0) {
      return rows.map(mapSystemRow);
    }
  } catch {}

  const legacyRows = await prisma.auditLog.findMany({
    where: { targetType: SYSTEM_LOG_TARGET_TYPE, action: { startsWith: SYSTEM_LOG_ACTION_PREFIX } },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return legacyRows.map(mapLegacyAuditRow);
}

export async function clearSystemLogs() {
  try {
    await prisma.systemLog.deleteMany();
  } catch {}

  await prisma.auditLog.deleteMany({
    where: { targetType: SYSTEM_LOG_TARGET_TYPE, action: { startsWith: SYSTEM_LOG_ACTION_PREFIX } }
  });
}

export async function getSystemLogFileBuffer() {
  const logs = await readSystemLogs(5000);
  const content = logs
    .slice()
    .reverse()
    .map((entry) => JSON.stringify(entry))
    .join('\n');

  return Buffer.from(content ? `${content}\n` : '', 'utf8');
}

export function getDebugLogPath() {
  return 'database://system-log';
}

export async function cleanupSystemLogs() {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

  try {
    await Promise.all([
      prisma.systemLog.deleteMany({
        where: {
          timestamp: { lt: sevenDaysAgo },
          level: { in: ['debug', 'info'] },
          category: { not: 'security' }
        }
      }),
      prisma.systemLog.deleteMany({
        where: {
          timestamp: { lt: thirtyDaysAgo },
          level: 'warn',
          category: { notIn: ['security', 'payments', 'admin'] }
        }
      }),
      prisma.systemLog.deleteMany({
        where: {
          timestamp: { lt: ninetyDaysAgo },
          level: 'error'
        }
      })
    ]);
  } catch {}
}

export async function deleteUploadsDirectory() {
  return;
}
