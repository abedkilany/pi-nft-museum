'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type AccessPayload = {
  ok: boolean;
  user?: { username: string; role: string };
  access?: {
    permissions: string[];
    isSuperadmin: boolean;
    sections: {
      moderation: boolean;
      members: boolean;
      content: boolean;
      operations: boolean;
      system: boolean;
    };
  };
};

type AdminLink = {
  href: string;
  label: string;
  group: string;
  visible: (payload: AccessPayload | null) => boolean;
};

const adminLinks: AdminLink[] = [
  { href: '/admin', label: 'Overview', group: 'Workspace', visible: () => true },
  { href: '/admin/artworks', label: 'Review queue', group: 'Moderation', visible: (payload) => Boolean(payload?.access?.sections.moderation) },
  { href: '/admin/reports', label: 'Reports', group: 'Moderation', visible: (payload) => Boolean(payload?.access?.sections.moderation) },
  { href: '/admin/users', label: 'Members', group: 'Members', visible: (payload) => Boolean(payload?.access?.sections.members) },
  { href: '/admin/categories', label: 'Categories', group: 'Content', visible: (payload) => Boolean(payload?.access?.sections.content) },
  { href: '/admin/countries', label: 'Countries', group: 'Content', visible: (payload) => Boolean(payload?.access?.sections.content) },
  { href: '/admin/menu', label: 'Navigation menu', group: 'Content', visible: (payload) => Boolean(payload?.access?.sections.content) },
  { href: '/admin/pages', label: 'Pages', group: 'Content', visible: (payload) => Boolean(payload?.access?.sections.content) },
  { href: '/admin/settings', label: 'Operations', group: 'Operations', visible: (payload) => Boolean(payload?.access?.sections.operations) },
  { href: '/admin/system', label: 'Governance & logs', group: 'System', visible: (payload) => Boolean(payload?.access?.sections.system) },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [payload, setPayload] = useState<AccessPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await piApiFetch('/api/admin/access-summary', { cache: 'no-store' }).catch(() => null);
      if (!response || cancelled) return;
      const json = await response.json().catch(() => null);
      if (!cancelled) setPayload(json);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedLinks = useMemo(() => {
    const visibleLinks = adminLinks.filter((link) => link.visible(payload));
    return visibleLinks.reduce<Record<string, AdminLink[]>>((acc, link) => {
      acc[link.group] ||= [];
      acc[link.group].push(link);
      return acc;
    }, {});
  }, [payload]);

  const roleLabel = payload?.user?.role ? payload.user.role.replace(/_/g, ' ') : 'staff';

  return (
    <aside style={{ padding: '24px 0 24px 24px' }}>
      <div className="card" style={{ padding: '20px', position: 'sticky', top: '18px' }}>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Admin workspace</p>
        <h2 style={{ margin: '8px 0 16px' }}>Pi NFT Museum</h2>
        <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
          <strong style={{ display: 'block', textTransform: 'capitalize' }}>{roleLabel}</strong>
          <span style={{ color: 'var(--muted)' }}>Navigation is filtered by your current permissions.</span>
        </div>
        <nav style={{ display: 'grid', gap: '16px' }}>
          {Object.entries(groupedLinks).map(([group, links]) => (
            <div key={group} style={{ display: 'grid', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }}>{group}</p>
              {links.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="button secondary"
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      justifyContent: 'flex-start',
                      borderColor: isActive ? 'rgba(229, 181, 103, 0.45)' : undefined,
                      background: isActive ? 'rgba(229, 181, 103, 0.12)' : undefined,
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
          <Link href="/account" className="button secondary" style={{ justifyContent: 'flex-start' }}>
            Back to account
          </Link>
        </nav>
      </div>
    </aside>
  );
}
