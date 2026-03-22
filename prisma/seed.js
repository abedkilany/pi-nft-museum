const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const roles = [
  { key: 'superadmin', name: 'Super Admin', description: 'Full system access and staff governance' },
  { key: 'admin', name: 'Admin', description: 'Operations, members, content, and site management' },
  { key: 'moderator', name: 'Moderator', description: 'Reports, review queues, and community moderation' },
  { key: 'artist_or_trader', name: 'Artist or Trader', description: 'Connected marketplace member account' },
  { key: 'visitor', name: 'Visitor', description: 'Guest browsing role' },
];

const permissions = [
  { key: 'users.view', name: 'View users', description: 'Open the members area and user records' },
  { key: 'users.edit', name: 'Edit users', description: 'Update public profile and account fields for users' },
  { key: 'users.status.manage', name: 'Manage user status', description: 'Suspend, ban, or restore accounts' },
  { key: 'users.roles.manage', name: 'Manage user roles', description: 'Change member and staff role assignments' },
  { key: 'artworks.view', name: 'View artworks workspace', description: 'Open the review queue and moderation tools' },
  { key: 'artworks.review', name: 'Review artworks', description: 'Approve, return, or moderate artworks' },
  { key: 'artworks.publish', name: 'Publish artworks', description: 'Finalize and promote artworks into public states' },
  { key: 'artworks.reject', name: 'Reject artworks', description: 'Reject or hide submitted artworks' },
  { key: 'reports.view', name: 'View reports', description: 'Open member reports and abuse queues' },
  { key: 'reports.resolve', name: 'Resolve reports', description: 'Take action on member and content reports' },
  { key: 'community.moderate', name: 'Moderate community', description: 'Moderate posts, comments, and visible community activity' },
  { key: 'pages.manage', name: 'Manage pages', description: 'Create and update public pages' },
  { key: 'menu.manage', name: 'Manage menu', description: 'Edit the public navigation menu' },
  { key: 'categories.manage', name: 'Manage categories', description: 'Create and maintain artwork categories' },
  { key: 'countries.manage', name: 'Manage countries', description: 'Maintain country availability and phone metadata' },
  { key: 'settings.view', name: 'View settings', description: 'Open site operations and settings pages' },
  { key: 'settings.update', name: 'Update settings', description: 'Change site settings and operational windows' },
  { key: 'logs.view', name: 'View logs', description: 'Read and export system logs' },
  { key: 'audit.view', name: 'View audit trail', description: 'Open audit and governance history' },
  { key: 'staff.manage', name: 'Manage staff', description: 'Promote, demote, and govern moderator/admin access' },
];

const permissionSetsByRole = {
  visitor: [],
  artist_or_trader: [],
  moderator: [
    'artworks.view',
    'artworks.review',
    'artworks.reject',
    'reports.view',
    'reports.resolve',
    'community.moderate',
  ],
  admin: [
    'users.view',
    'users.edit',
    'users.status.manage',
    'artworks.view',
    'artworks.review',
    'artworks.publish',
    'artworks.reject',
    'reports.view',
    'reports.resolve',
    'community.moderate',
    'pages.manage',
    'menu.manage',
    'categories.manage',
    'countries.manage',
    'settings.view',
    'settings.update',
  ],
  superadmin: permissions.map((permission) => permission.key),
};

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { name: permission.name, description: permission.description },
      create: permission,
    });
  }

  const rolesFromDb = await prisma.role.findMany();
  const permissionsFromDb = await prisma.permission.findMany();
  const permissionByKey = new Map(permissionsFromDb.map((permission) => [permission.key, permission]));

  for (const role of rolesFromDb) {
    const targetPermissionKeys = permissionSetsByRole[role.key] || [];
    const targetPermissionIds = targetPermissionKeys
      .map((key) => permissionByKey.get(key))
      .filter(Boolean)
      .map((permission) => permission.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const permissionId of targetPermissionIds) {
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId },
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
  console.log('Roles configured: Visitor, Artist or Trader, Moderator, Admin, Super Admin.');
  console.log('Pi-only login is enabled. Use PI_MODERATOR_USERNAMES / PI_MODERATOR_UIDS, PI_ADMIN_USERNAMES / PI_ADMIN_UIDS, and PI_SUPERADMIN_USERNAMES / PI_SUPERADMIN_UIDS in .env to grant staff access on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
