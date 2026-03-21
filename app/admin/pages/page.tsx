import { prisma } from '@/lib/prisma';
import { PageBuilder } from '@/components/admin/PageBuilder';

export default async function AdminPagesPage() {
  const pages = await prisma.page.findMany({
    include: { sections: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ updatedAt: 'desc' }]
  });

  const normalized = pages.map((page: any) => ({
    ...page,
    sections: page.sections.map((section: any) => ({
      id: section.id,
      sectionKey: section.sectionKey,
      sectionType: (section.sectionType as 'hero' | 'rich_text' | 'image' | 'cta') || 'rich_text',
      title: section.title || '',
      content: section.content || '',
      settingsJson: (section.settingsJson || {}) as any,
      sortOrder: section.sortOrder,
      isEnabled: section.isEnabled
    }))
  }));

  return <PageBuilder pages={normalized} />;
}
