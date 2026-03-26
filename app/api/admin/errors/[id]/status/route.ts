import { type Prisma, type ErrorStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { ADMIN_ERROR_STATUSES } from '@/types/admin';
import { readEnumFromFormData, readOptionalStringFromFormData } from '@/lib/request-validation';

const allowed = ADMIN_ERROR_STATUSES;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid error id.' }, { status: 400 });
  }

  const formData = await request.formData();
  const statusResult = readEnumFromFormData(formData, 'status', allowed, { required: true, normalize: 'upper' });
  if (!statusResult.ok) return statusResult.response;
  const noteResult = readOptionalStringFromFormData(formData, 'note', { maxLength: 2000 });
  if (!noteResult.ok) return noteResult.response;

  const status = statusResult.data as ErrorStatus;
  const note = noteResult.data.trim();

  const current = await prisma.errorLog.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: 'Error log not found.' }, { status: 404 });
  }

  const resolvedAt = status === 'RESOLVED' ? new Date() : null;
  const ignoredAt = status === 'IGNORED' ? new Date() : null;

  const updateData: Prisma.ErrorLogUpdateInput = {
    status,
    resolvedAt,
    ignoredAt,
    ...(note
      ? {
          extraJson: {
            ...(current.extraJson && typeof current.extraJson === 'object' && !Array.isArray(current.extraJson)
              ? (current.extraJson as Prisma.InputJsonObject)
              : {}),
            adminNote: note,
            adminNoteBy: admin.user.userId,
            adminNoteAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        }
      : {}),
  };

  await prisma.errorLog.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ERROR_STATUS_UPDATED',
    targetType: 'ERROR_LOG',
    targetId: id,
    oldValues: {
      status: current.status,
      resolvedAt: current.resolvedAt,
      ignoredAt: current.ignoredAt,
    },
    newValues: { status, note: note || null },
  });

  logger.info('Error log status updated', {
    errorLogId: id,
    status,
    adminUserId: admin.user.userId,
  });

  return NextResponse.redirect(new URL(`/admin/errors/${id}`, request.url));
}
