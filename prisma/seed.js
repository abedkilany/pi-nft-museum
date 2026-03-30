const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: 'superadmin', name: 'Super Admin', description: 'Full system access' },
    { key: 'admin', name: 'Admin', description: 'Administrative access' },
    { key: 'moderator', name: 'Moderator', description: 'Moderation role' },
    { key: 'artist_or_trader', name: 'Artist or Trader', description: 'Connected marketplace member account' },
    { key: 'visitor', name: 'Visitor', description: 'Guest browsing role' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  const permissions = [
    { key: 'admin.access', name: 'Admin Panel Access', description: 'Open and use the admin area.' },
    { key: 'users.view', name: 'View Users', description: 'Open user management pages and browse account details.' },
    { key: 'users.manage', name: 'Manage Users', description: 'Edit user profile details and moderation status.' },
    { key: 'users.roles.manage', name: 'Manage Roles and Permissions', description: 'Create roles, assign permissions, and change elevated access.' },
    { key: 'artworks.moderate', name: 'Moderate Artworks', description: 'Approve, reject, reopen, and inspect protected artwork states.' },
    { key: 'artworks.review', name: 'Review Artworks', description: 'Handle review-stage workflows and public review queues.' },
    { key: 'settings.manage', name: 'Manage Settings', description: 'Change site settings and business rules.' },
    { key: 'logs.view', name: 'View Logs', description: 'Access audit trails, app events, and technical observability tools.' },
    { key: 'comments.moderate', name: 'Moderate Comments', description: 'Hide or restore comments as staff.' },
    { key: 'comments.edit.any', name: 'Edit Any Comment', description: 'Edit comments created by other users.' },
    { key: 'comments.delete.any', name: 'Delete Any Comment', description: 'Delete comments created by other users.' },
    { key: 'payments.create', name: 'Create Payments', description: 'Initiate Pi payment approval flows.' },
    { key: 'payments.complete.any', name: 'Complete Any Payment', description: 'Complete Pi payments on behalf of other users when needed.' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { name: permission.name, description: permission.description },
      create: permission,
    });
  }

  const allPermissionKeys = permissions.map((item) => item.key);
  const rolePermissionMap = {
    superadmin: allPermissionKeys,
    admin: [],
    moderator: [],
    artist_or_trader: [],
    visitor: [],
  };

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUnique({ where: { key: roleKey } });
    if (!role) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionKey of permissionKeys) {
      const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
      if (!permission) continue;

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log('Seed completed successfully. Permissions are aligned with the admin Roles & permissions page.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
