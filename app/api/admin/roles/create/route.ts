import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { PERMISSIONS, getAllPermissionKeys, isSystemRole, type PermissionKey } from '@/lib/permissions';
import { assertSameOrigin, applyRateLimit } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { can } from '@/lib/policy';

function normalizeRoleKey(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}


function rolesRedirect(request: Request, query: string) {
  const url = new URL(`/admin/roles?${query}`, request.url);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const admin = await requireAdminApi(PERMISSIONS.userRolesManage);
  if ('error' in admin) return admin.error;
  if (!(await can(admin.user, PERMISSIONS.userRolesManage))) {
    return NextResponse.json({ error: 'You do not have permission for this action.' }, { status: 403 });
  }

  const rateLimitError = applyRateLimit(request, [admin.user.userId], 'admin-role-create', [
    { limit: 10, windowMs: 10 * 60 * 1000 },
    { limit: 30, windowMs: 60 * 60 * 1000 },
  ]);
  if (rateLimitError) return rateLimitError;

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const keyInput = String(formData.get('key') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const permissionKeys = formData.getAll('permissionKeys').map((value) => String(value)) as PermissionKey[];
  const roleKey = normalizeRoleKey(keyInput || name);
  const validPermissionKeys = new Set(getAllPermissionKeys());

  if (!name) {
    return rolesRedirect(request, 'error=missing-fields');
  }

  if (!roleKey || roleKey.length < 3) {
    return rolesRedirect(request, 'error=invalid-role-key');
  }

  if (isSystemRole(roleKey)) {
    return rolesRedirect(request, 'error=duplicate-role');
  }

  if (permissionKeys.some((key) => !validPermissionKeys.has(key))) {
    return rolesRedirect(request, 'error=unknown-permission');
  }

  const existingRole = await prisma.role.findUnique({ where: { key: roleKey } });
  if (existingRole) {
    return rolesRedirect(request, 'error=duplicate-role');
  }

  const permissions = permissionKeys.length
    ? await prisma.permission.findMany({ where: { key: { in: permissionKeys } } })
    : [];

  const role = await prisma.role.create({
    data: {
      key: roleKey,
      name,
      description: description || null,
      permissions: {
        create: permissions.map((permission) => ({ permissionId: permission.id })),
      },
    },
  });

  await createAuditLog({
    userId: admin.user.userId,
    action: 'ADMIN_ROLE_CREATED',
    targetType: 'ROLE',
    targetId: role.id,
    newValues: { key: role.key, name: role.name, permissionKeys },
  });

  logger.info('Admin created role', { adminUserId: admin.user.userId, roleId: role.id, roleKey: role.key });
  return rolesRedirect(request, 'created=1');
}
