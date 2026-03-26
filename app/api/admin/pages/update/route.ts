import { type PageStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { type AdminPageSectionInput, type AdminPageUpdateBody, ADMIN_PAGE_STATUSES } from '@/types/admin';

const ALLOWED_PAGE_STATUSES = new Set<PageStatus>(ADMIN_PAGE_STATUSES);

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

function normalizeSection(section: AdminPageSectionInput, pageId: number, index: number) {
  return {
    pageId,
    sectionKey: String(section.sectionKey || `section-${index + 1}`),
    sectionType: String(section.sectionType || 'rich_text'),
    title: String(section.title || '').trim() || null,
    content: String(section.content || '').trim() || null,
    settingsJson: section.settingsJson || undefined,
    sortOrder: index,
    isEnabled: section.isEnabled !== false
  };
}

export async function POST(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  try {
    const body = (await request.json()) as AdminPageUpdateBody;
    const pageId = Number(body.pageId || 0);
    const title = String(body.title || '').trim();
    const slug = normalizeSlug(String(body.slug || '').trim());
    const status = ALLOWED_PAGE_STATUSES.has((body.status || 'DRAFT') as PageStatus) ? (body.status || 'DRAFT') as PageStatus : 'DRAFT';
    if (!pageId || !title || !slug) {
      return NextResponse.json({ error: 'Page, title, and slug are required.' }, { status: 400 });
    }

    const currentPage = await prisma.page.findUnique({ where: { id: pageId }, include: { sections: true } });
    if (!currentPage) {
      return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    }

    await prisma.page.update({
      where: { id: pageId },
      data: {
        title,
        slug,
        status,
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
        data: sections.map((section, index) => normalizeSection(section, pageId, index))
      });
    }

    await createAuditLog({
      userId: admin.user.userId,
      action: 'ADMIN_PAGE_UPDATED',
      targetType: 'PAGE',
      targetId: pageId,
      oldValues: { title: currentPage.title, slug: currentPage.slug, status: currentPage.status, sectionsCount: currentPage.sections.length },
      newValues: { title, slug, status, sectionsCount: sections.length || currentPage.sections.length }
    });

    logger.info('Page updated', { userId: admin.user.userId, pageId, slug });
    return NextResponse.json({ ok: true, message: 'Page updated successfully.' });
  } catch (error) {
    logger.error('Failed to update page', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
