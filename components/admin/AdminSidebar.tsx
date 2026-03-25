'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { withAdminGrant } from '@/lib/admin-url';

type AdminLinkGroup = {
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
};

const adminLinkGroups: AdminLinkGroup[] = [
  {
    title: 'Operations',
    description: 'Daily moderation and content tools.',
    links: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/artworks', label: 'Artworks' },
      { href: '/admin/reports', label: 'Reports' },
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/roles', label: 'Roles & permissions' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/countries', label: 'Countries' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/menu', label: 'Menu' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
  {
    title: 'Observability',
    description: 'Useful monitoring and admin activity.',
    links: [
      { href: '/admin/errors', label: 'Error center' },
      { href: '/admin/events', label: 'Event stream' },
      { href: '/admin/audit', label: 'Audit trail' },
    ],
  },
  {
    title: 'Developer tools',
    description: 'Technical logs kept outside the main workflow.',
    links: [{ href: '/admin/system', label: 'Developer logs' }],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const adminGrant = searchParams.get('admin_grant');

  return (
    <aside style={{ padding: '24px 0 24px 24px' }}>
      <div className="card" style={{ padding: '20px', position: 'sticky', top: '18px' }}>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Admin control</p>
        <h2 style={{ margin: '8px 0 16px' }}>Pi NFT Museum</h2>
        <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
          <strong style={{ display: 'block' }}>Protected area</strong>
          <span style={{ color: 'var(--muted)' }}>Only admin-approved roles can open these tools.</span>
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          {adminLinkGroups.map((group) => (
            <section key={group.title} style={{ display: 'grid', gap: '8px' }}>
              <div>
                <strong style={{ display: 'block' }}>{group.title}</strong>
                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>{group.description}</span>
              </div>
              <nav style={{ display: 'grid', gap: '8px' }}>
                {group.links.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={withAdminGrant(link.href, adminGrant)}
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
              </nav>
            </section>
          ))}

          <Link href="/account" className="button secondary" style={{ justifyContent: 'flex-start' }}>
            Back to account
          </Link>
        </div>
      </div>
    </aside>
  );
}
