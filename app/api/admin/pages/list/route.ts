import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';

export async function GET() {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

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

  return NextResponse.json({ ok: true, data: normalized });
}
