import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  try {
    const body = await request.json();
    const pageId = Number(body.pageId || 0);
    const title = String(body.title || '').trim();
    const slug = normalizeSlug(String(body.slug || '').trim());
    if (!pageId || !title || !slug) {
      return NextResponse.json({ error: 'Page, title, and slug are required.' }, { status: 400 });
    }

    await prisma.page.update({
      where: { id: pageId },
      data: {
        title,
        slug,
        status: body.status || 'DRAFT',
        menuLabel: String(body.menuLabel || '').trim() || null,
        showInMenu: Boolean(body.showInMenu),
        seoTitle: String(body.seoTitle || '').trim() || null,
        seoDescription: String(body.seoDescription || '').trim() || null
      }
    });

    await prisma.pageSection.deleteMany({ where: { pageId } });
    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (sections.length > 0) {
      await prisma.pageSection.createMany({
        data: sections.map((section: any, index: number) => ({
          pageId,
          sectionKey: String(section.sectionKey || `section-${index + 1}`),
          sectionType: String(section.sectionType || 'rich_text'),
          title: String(section.title || '').trim() || null,
          content: String(section.content || '').trim() || null,
          settingsJson: section.settingsJson || undefined,
          sortOrder: index,
          isEnabled: section.isEnabled !== false
        }))
      });
    }

    logger.info('Page updated', { userId: admin.user.userId, pageId, slug });
    return NextResponse.json({ ok: true, message: 'Page updated successfully.' });
  } catch (error) {
    logger.error('Failed to update page', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
