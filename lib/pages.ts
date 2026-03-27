import { prisma } from '@/lib/prisma';

export async function getPageContentBySlug(slug: string) {
  return prisma.page.findUnique({
    where: { slug },
    include: {
      sections: {
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' }
      }
    }
  });
}

export function getPrimarySectionContent(page: { sections: Array<{ content: string | null }> }) {
  return page.sections.map((section) => section.content || '').filter(Boolean).join('\n\n');
}
