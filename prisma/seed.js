
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { key: 'superadmin', name: 'Super Admin', description: 'Full system access' },
    { key: 'admin', name: 'Admin', description: 'Administrative access' },
    { key: 'artist_or_trader', name: 'Artist or Trader', description: 'Connected marketplace member account' },
    { key: 'visitor', name: 'Visitor', description: 'Guest browsing role' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({ where: { key: role.key }, update: { name: role.name, description: role.description }, create: role });
  }

  const permissions = [
    { key: 'manage_users', name: 'Manage Users' },
    { key: 'manage_roles', name: 'Manage Roles' },
    { key: 'manage_artworks', name: 'Manage Artworks' },
    { key: 'manage_pages', name: 'Manage Pages' },
    { key: 'manage_settings', name: 'Manage Settings' },
    { key: 'view_system_logs', name: 'View System Logs' }
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({ where: { key: permission.key }, update: { name: permission.name }, create: permission });
  }

  const superadminRole = await prisma.role.findUnique({ where: { key: 'superadmin' } });
  const adminRole = await prisma.role.findUnique({ where: { key: 'admin' } });
  const allPermissions = await prisma.permission.findMany();
  for (const role of [superadminRole, adminRole].filter(Boolean)) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
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
  console.log('Pi-only login is enabled. Guests browse as Visitors. Connected Pi users are created as Artist or Trader by default. To grant admin access, add your Pi username or Pi UID in .env before first login.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
