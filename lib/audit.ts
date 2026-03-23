import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { trackAppEvent, sanitizeEventValue } from '@/lib/app-events';

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export async function createAuditLog(input: {
  userId?: number | null;
  action: string;
  targetType: string;
  targetId?: string | number | null;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId == null ? null : String(input.targetId),
        oldValuesJson:
          input.oldValues === undefined ? Prisma.JsonNull : (sanitizeEventValue(input.oldValues) as Prisma.InputJsonValue),
        newValuesJson:
          input.newValues === undefined ? Prisma.JsonNull : (sanitizeEventValue(input.newValues) as Prisma.InputJsonValue),
      },
    });

    const newValuesRecord = asRecord(input.newValues);

    await trackAppEvent({
      category: 'AUDIT',
      type: 'AUDIT_LOG',
      name: input.action,
      status: 'SUCCESS',
      isHealthy: true,
      source: 'SERVER',
      userId: input.userId ?? null,
      feature: typeof newValuesRecord?.feature === 'string' ? newValuesRecord.feature : null,
      route: typeof newValuesRecord?.route === 'string' ? newValuesRecord.route : null,
      requestId: typeof newValuesRecord?.requestId === 'string' ? newValuesRecord.requestId : null,
      traceId: typeof newValuesRecord?.traceId === 'string' ? newValuesRecord.traceId : null,
      correlationId: typeof newValuesRecord?.correlationId === 'string' ? newValuesRecord.correlationId : null,
      sessionId: typeof newValuesRecord?.sessionId === 'string' ? newValuesRecord.sessionId : null,
      entityType: input.targetType,
      entityId: input.targetId == null ? null : String(input.targetId),
      message: `${input.action} on ${input.targetType}`,
      data: {
        oldValues: sanitizeEventValue(input.oldValues),
        newValues: sanitizeEventValue(input.newValues)
      }
    });
  } catch {
    // avoid breaking user flows because of audit log issues
  }
}
