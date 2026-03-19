import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
          input.oldValues === undefined ? Prisma.JsonNull : (input.oldValues as Prisma.InputJsonValue),
        newValuesJson:
          input.newValues === undefined ? Prisma.JsonNull : (input.newValues as Prisma.InputJsonValue),
      },
    });
  } catch {
    // avoid breaking user flows because of audit log issues
  }
}