const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: 'superadmin', name: 'Super Admin', description: 'Full system access and role management' },
    { key: 'admin', name: 'Admin', description: 'Administrative operations and site settings' },
    { key: 'moderator', name: 'Moderator', description: 'Moderates artworks and comments' },
    { key: 'reviewer', name: 'Reviewer', description: 'Handles review-stage workflows' },
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
    { key: 'admin.access', name: 'Access Admin Panel', description: 'Open and use the admin area' },
    { key: 'users.view', name: 'View Users', description: 'Open user management screens' },
    { key: 'users.manage', name: 'Manage Users', description: 'Edit user profiles and statuses' },
    { key: 'user.roles.manage', name: 'Manage User Roles', description: 'Assign elevated roles and permissions' },
    { key: 'artworks.moderate', name: 'Moderate Artworks', description: 'Approve, reject, and inspect protected artwork views' },
    { key: 'artworks.review', name: 'Review Artworks', description: 'Handle review-stage operations' },
    { key: 'settings.manage', name: 'Manage Settings', description: 'Change site and workflow settings' },
    { key: 'logs.view', name: 'View Logs', description: 'Access log and observability screens' },
    { key: 'comments.moderate', name: 'Moderate Comments', description: 'Hide or restore comments as staff' },
    { key: 'comments.edit.any', name: 'Edit Any Comment', description: 'Edit comments beyond self-service rules' },
    { key: 'comments.delete.any', name: 'Delete Any Comment', description: 'Delete comments created by other users' },
    { key: 'payments.create', name: 'Create Payments', description: 'Initiate Pi payment approval flow' },
    { key: 'payments.complete.any', name: 'Complete Any Payment', description: 'Complete payments for other users when needed' },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { name: permission.name, description: permission.description },
      create: permission,
    });
  }

  const rolePermissionMap = {
    superadmin: permissions.map((item) => item.key),
    admin: [
      'admin.access',
      'users.view',
      'artworks.moderate',
      'artworks.review',
      'settings.manage',
      'logs.view',
      'comments.moderate',
      'comments.edit.any',
      'comments.delete.any',
      'payments.create',
      'payments.complete.any',
    ],
    moderator: [
      'admin.access',
      'artworks.moderate',
      'comments.moderate',
      'comments.edit.any',
      'comments.delete.any',
    ],
    reviewer: ['admin.access', 'artworks.review'],
    artist_or_trader: ['payments.create'],
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

  const categories = [
    { name: 'Abstract', slug: 'abstract', description: 'Abstract NFT artworks', sortOrder: 1 },
    { name: 'Concept', slug: 'concept', description: 'Concept digital artworks', sortOrder: 2 },
    { name: 'Portrait', slug: 'portrait', description: 'Portrait artworks', sortOrder: 3 },
    { name: 'Futuristic', slug: 'futuristic', description: 'Futuristic NFT artworks', sortOrder: 4 }
  ];
  for (const category of categories) {
    await prisma.artworkCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder, isActive: true },
      create: category
    });
  }

  const informationalPages = [
    {
      title: 'About',
      slug: 'about',
      menuLabel: 'About',
      showInMenu: true,
      status: 'PUBLISHED',
      sections: [
        {
          sectionKey: 'hero',
          sectionType: 'hero',
          title: 'About Pi NFT Museum',
          content: 'Pi NFT Museum is preparing a curated NFT experience for the Pi Network ecosystem.',
          settingsJson: { buttonLabel: 'Open gallery', buttonHref: '/gallery' }
        }
      ]
    },
    {
      title: 'Community Rules',
      slug: 'community-rules',
      menuLabel: 'Rules',
      showInMenu: true,
      status: 'PUBLISHED',
      sections: [
        {
          sectionKey: 'main',
          sectionType: 'rich_text',
          title: 'Community rules',
          content: 'Respect artists, avoid spam, and keep feedback constructive.'
        }
      ]
    }
  ];

  for (const entry of informationalPages) {
    const page = await prisma.page.upsert({
      where: { slug: entry.slug },
      update: { title: entry.title, status: entry.status, menuLabel: entry.menuLabel, showInMenu: entry.showInMenu },
      create: { title: entry.title, slug: entry.slug, status: entry.status, menuLabel: entry.menuLabel, showInMenu: entry.showInMenu }
    });
    const existingSections = await prisma.pageSection.count({ where: { pageId: page.id } });
    if (!existingSections) {
      for (let index = 0; index < entry.sections.length; index += 1) {
        const section = entry.sections[index];
        await prisma.pageSection.create({
          data: {
            pageId: page.id,
            sectionKey: section.sectionKey,
            sectionType: section.sectionType,
            title: section.title,
            content: section.content,
            settingsJson: section.settingsJson,
            sortOrder: index,
            isEnabled: true
          }
        });
      }
    }
  }

  console.log('Seed completed successfully.');
  console.log('Phase 2 roles and permissions are configured. Run this seed after deployment so the new permission map is written to the database.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
