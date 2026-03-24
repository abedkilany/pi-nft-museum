import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS, getAllPermissionKeys, type PermissionKey } from '@/lib/permissions';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';


function rolesRedirect(request: Request, query: string) {
  const url = new URL(`/admin/roles?${query}`, request.url);
  const adminGrant = new URL(request.url).searchParams.get('admin_grant');
  if (adminGrant) {
    url.searchParams.set('admin_grant', adminGrant);
  }
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.userRolesManage);
  if ('error' in admin) return admin.error;

  const rateLimitError = applyRateLimit(request, [admin.user.userId], 'admin-role-update', [
    { limit: 20, windowMs: 10 * 60 * 1000 },
    { limit: 80, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const formData = await request.formData();
  const roleId = Number(formData.get('roleId'));
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const submittedPermissionKeys = formData.getAll('permissionKeys').map((value) => String(value)) as PermissionKey[];
  const validPermissionKeys = new Set(getAllPermissionKeys());

  if (!roleId || !name) {
    return rolesRedirect(request, 'error=missing-fields');
  }

  if (submittedPermissionKeys.some((key) => !validPermissionKeys.has(key))) {
    return rolesRedirect(request, 'error=unknown-permission');
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    return rolesRedirect(request, 'error=not-found');
  }

  const permissionKeys = role.key === 'superadmin' ? getAllPermissionKeys() : submittedPermissionKeys;
  const permissions = permissionKeys.length
    ? await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
    : [];

  await prisma.$transaction(async (tx) => {
    await tx.role.update({
      where: { id: role.id },
      data: {
        name,
        description: description || null,
      },
    });

    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (permissions.length) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ROLE_UPDATED',
    targetType: 'ROLE',
    targetId: role.id,
    oldValues: {
      name: role.name,
      description: role.description,
      permissionKeys: role.permissions.map((entry) => entry.permission.key),
    },
    newValues: {
      name,
      description,
      permissionKeys,
    },
  });

  logger.info('Admin updated role', { adminUserId: admin.user.userId, roleId: role.id, roleKey: role.key });
  return rolesRedirect(request, role.key === 'superadmin' ? 'superadminPermissionsFixed=1' : 'updated=1');
}
