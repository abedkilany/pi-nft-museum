import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap } from '@/lib/site-settings';

export type MenuItem = {
  label: string;
  href: string;
  visibility?: 'public' | 'guest' | 'auth' | 'admin';
  enabled?: boolean;
};

const DEFAULT_MENU: MenuItem[] = [
  { label: 'Home', href: '/', visibility: 'public', enabled: true },
  { label: 'Gallery', href: '/gallery', visibility: 'public', enabled: true },
  { label: 'Premium', href: '/premium', visibility: 'public', enabled: true },
  { label: 'Review', href: '/review', visibility: 'public', enabled: true },
  { label: 'Upload', href: '/upload', visibility: 'auth', enabled: true },
  { label: 'Community', href: '/community', visibility: 'public', enabled: true }
];

export function normalizeMenuItems(value: unknown): MenuItem[] {
  if (!Array.isArray(value)) return DEFAULT_MENU;
  const items = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const label = String(candidate.label || '').trim();
      const href = String(candidate.href || '').trim();
      if (!label || !href) return null;
      const visibility = ['public', 'guest', 'auth', 'admin'].includes(String(candidate.visibility || 'public'))
        ? (String(candidate.visibility || 'public') as MenuItem['visibility'])
        : 'public';
      return {
        label,
        href,
        visibility,
        enabled: candidate.enabled !== false
      } satisfies MenuItem;
    })
    .filter(Boolean) as MenuItem[];

  return items.length > 0 ? items : DEFAULT_MENU;
}

export async function getMenuItems() {
  const settings = await getSiteSettingsMap();
  let manual = DEFAULT_MENU;
  try {
    manual = normalizeMenuItems(JSON.parse(settings.menu_json || '[]'));
  } catch {
    manual = DEFAULT_MENU;
  }

  const managedPages = await prisma.page.findMany({
    where: { status: 'PUBLISHED', showInMenu: true },
    orderBy: { title: 'asc' },
    select: { slug: true, title: true, menuLabel: true }
  });

  const autoPageItems = managedPages.map((page) => ({
    label: page.menuLabel || page.title,
    href: `/pages/${page.slug}`,
    visibility: 'public' as const,
    enabled: true
  }));

  const hrefs = new Set(manual.map((item) => item.href));
  for (const item of autoPageItems) {
    if (!hrefs.has(item.href)) manual.push(item);
  }

  return manual;
}

export function getDefaultMenu() {
  return DEFAULT_MENU;
}
