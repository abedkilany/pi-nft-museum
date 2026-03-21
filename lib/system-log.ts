import { prisma } from '@/lib/prisma';

export type SystemLogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: unknown;
};

const SYSTEM_LOG_TARGET_TYPE = 'SYSTEM';
const SYSTEM_LOG_ACTION_PREFIX = 'SYSTEM_LOG_';

function toAuditAction(level: SystemLogEntry['level']) {
  return `${SYSTEM_LOG_ACTION_PREFIX}${level.toUpperCase()}`;
}

function fromAuditAction(action: string): SystemLogEntry['level'] {
  const raw = action.replace(SYSTEM_LOG_ACTION_PREFIX, '').toLowerCase();
  return ['debug', 'info', 'warn', 'error'].includes(raw) ? (raw as SystemLogEntry['level']) : 'info';
}

export async function appendSystemLog(entry: SystemLogEntry) {
  await prisma.auditLog.create({
    data: {
      action: toAuditAction(entry.level),
      targetType: SYSTEM_LOG_TARGET_TYPE,
      targetId: entry.timestamp,
      newValuesJson: {
        message: entry.message,
        meta: entry.meta ?? null,
        timestamp: entry.timestamp,
        level: entry.level
      }
    }
  });
}

export async function readSystemLogs(limit = 250): Promise<SystemLogEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { targetType: SYSTEM_LOG_TARGET_TYPE, action: { startsWith: SYSTEM_LOG_ACTION_PREFIX } },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return rows.map((row: any) => {
    const payload = row.newValuesJson && typeof row.newValuesJson === 'object' && !Array.isArray(row.newValuesJson)
      ? (row.newValuesJson as Record<string, unknown>)
      : {};

    const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : row.createdAt.toISOString();
    const message = typeof payload.message === 'string' ? payload.message : row.action;
    const level = typeof payload.level === 'string' && ['debug', 'info', 'warn', 'error'].includes(payload.level)
      ? (payload.level as SystemLogEntry['level'])
      : fromAuditAction(row.action);

    return {
      timestamp,
      level,
      message,
      meta: 'meta' in payload ? payload.meta : null
    };
  });
}

export async function clearSystemLogs() {
  await prisma.auditLog.deleteMany({
    where: { targetType: SYSTEM_LOG_TARGET_TYPE, action: { startsWith: SYSTEM_LOG_ACTION_PREFIX } }
  });
}

export async function getSystemLogFileBuffer() {
  const logs = await readSystemLogs(5000);
  const content = logs
    .slice()
    .reverse()
    .map((entry: any) => JSON.stringify(entry))
    .join('\n');

  return Buffer.from(content ? `${content}\n` : '', 'utf8');
}

export function getDebugLogPath() {
  return 'database://audit-log/system';
}

export async function deleteUploadsDirectory() {
  return;
}
