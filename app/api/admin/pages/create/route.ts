import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin';
import { logger } from '@/lib/logger';

type Payload = {
  title?: string;
  slug?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  menuLabel?: string;
  showInMenu?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  sections?: Array<{
    sectionKey?: string;
    sectionType?: string;
    title?: string;
    content?: string;
    settingsJson?: unknown;
    sortOrder?: number;
    isEnabled?: boolean;
  }>;
};

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if ('error' in admin) return admin.error;

  try {
    const body = (await request.json()) as Payload;
    const title = String(body.title || '').trim();
    const slug = normalizeSlug(String(body.slug || '').trim());
    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required.' }, { status: 400 });
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        status: body.status || 'DRAFT',
        menuLabel: String(body.menuLabel || '').trim() || null,
        showInMenu: Boolean(body.showInMenu),
        seoTitle: String(body.seoTitle || '').trim() || null,
        seoDescription: String(body.seoDescription || '').trim() || null,
        sections: {
          create: (body.sections || []).map((section, index) => ({
            sectionKey: String(section.sectionKey || `section-${index + 1}`),
            sectionType: String(section.sectionType || 'rich_text'),
            title: String(section.title || '').trim() || null,
            content: String(section.content || '').trim() || null,
            settingsJson: section.settingsJson || undefined,
            sortOrder: index,
            isEnabled: section.isEnabled !== false
          }))
        }
      }
    });

    logger.info('Page created', { userId: admin.user.userId, pageId: page.id, slug });
    return NextResponse.json({ ok: true, message: 'Page created successfully.' });
  } catch (error) {
    logger.error('Failed to create page', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown server error' }, { status: 500 });
  }
}
