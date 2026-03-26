import { type PageStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { assertSameOrigin } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { getEnumField, getNumberField, getOptionalBooleanField, getStringField, isRecord, readJsonObject, validationError } from '@/lib/request-validation';
import { type AdminPageSectionInput, ADMIN_PAGE_STATUSES } from '@/types/admin';

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
    const parsedBody = await readJsonObject(request);
    if (!parsedBody.ok) return parsedBody.response;

    const pageIdResult = getNumberField(parsedBody.data, 'pageId', { required: true, integer: true, min: 1 });
    if (!pageIdResult.ok) return pageIdResult.response;
    const titleResult = getStringField(parsedBody.data, 'title', { required: true, maxLength: 200 });
    if (!titleResult.ok) return titleResult.response;
    const slugResult = getStringField(parsedBody.data, 'slug', { required: true, maxLength: 200 });
    if (!slugResult.ok) return slugResult.response;
    const statusResult = getEnumField(parsedBody.data, 'status', ADMIN_PAGE_STATUSES, {
      required: false,
      defaultValue: 'DRAFT',
      normalize: 'upper',
    });
    if (!statusResult.ok) return statusResult.response;

    const pageId = pageIdResult.data;
    const title = titleResult.data;
    const slug = normalizeSlug(slugResult.data);
    const status = statusResult.data as PageStatus;
    const menuLabel = typeof parsedBody.data.menuLabel === 'string' ? parsedBody.data.menuLabel.trim() : '';
    const seoTitle = typeof parsedBody.data.seoTitle === 'string' ? parsedBody.data.seoTitle.trim() : '';
    const seoDescription = typeof parsedBody.data.seoDescription === 'string' ? parsedBody.data.seoDescription.trim() : '';
    const showInMenu = getOptionalBooleanField(parsedBody.data, 'showInMenu', false);

    const rawSections = parsedBody.data.sections;
    if (rawSections != null && !Array.isArray(rawSections)) {
      return validationError('"sections" must be an array.', { sections: 'Must be an array' });
    }
    const sections = Array.isArray(rawSections)
      ? rawSections.filter(isRecord) as AdminPageSectionInput[]
      : [];

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
        menuLabel: menuLabel || null,
        showInMenu,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null
      }
    });

    await prisma.pageSection.deleteMany({ where: { pageId } });
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
