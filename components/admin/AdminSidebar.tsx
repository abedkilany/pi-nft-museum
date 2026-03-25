'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { adminApiFetch } from '@/lib/admin-auth-client';
import { PERMISSIONS, type PermissionKey } from '@/lib/permissions';

type AdminLinkGroup = {
  title: string;
  description: string;
  links: Array<{ href: string; label: string; permission?: PermissionKey }>;
};

const adminLinkGroups: AdminLinkGroup[] = [
  {
    title: 'Operations',
    description: 'Daily moderation and content tools.',
    links: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/artworks', label: 'Artworks', permission: PERMISSIONS.artworksModerate },
      { href: '/admin/reports', label: 'Reports' },
      { href: '/admin/users', label: 'Users', permission: PERMISSIONS.usersView },
      { href: '/admin/roles', label: 'Roles & permissions', permission: PERMISSIONS.userRolesManage },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/countries', label: 'Countries' },
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/menu', label: 'Menu' },
      { href: '/admin/settings', label: 'Settings', permission: PERMISSIONS.settingsManage },
    ],
  },
  {
    title: 'Observability',
    description: 'Useful monitoring and admin activity.',
    links: [
      { href: '/admin/errors', label: 'Error center', permission: PERMISSIONS.logsView },
      { href: '/admin/events', label: 'Event stream', permission: PERMISSIONS.logsView },
      { href: '/admin/audit', label: 'Audit trail', permission: PERMISSIONS.logsView },
    ],
  },
  {
    title: 'Developer tools',
    description: 'Technical logs kept outside the main workflow.',
    links: [{ href: '/admin/system', label: 'Developer logs', permission: PERMISSIONS.logsView }],
  },
];

export function AdminSidebar({ currentUser }: { currentUser: { username: string; role: string; permissions: string[] } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const visibleGroups = useMemo(() => {
    const currentPermissions = new Set(currentUser.permissions || []);
    return adminLinkGroups
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => !link.permission || currentPermissions.has(link.permission)),
      }))
      .filter((group) => group.links.length > 0);
  }, [currentUser.permissions]);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await adminApiFetch('/api/admin/auth/logout', {
        method: 'POST',
      });
    } finally {
      router.replace('/admin-login');
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <aside style={{ padding: '24px 0 24px 24px' }}>
      <div className="card" style={{ padding: '20px', position: 'sticky', top: '18px' }}>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Admin control</p>
        <h2 style={{ margin: '8px 0 16px' }}>Pi NFT Museum</h2>
        <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
          <strong style={{ display: 'block' }}>{currentUser.username}</strong>
          <span style={{ color: 'var(--muted)' }}>Signed in as {currentUser.role} with a dedicated admin web session.</span>
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          {visibleGroups.map((group) => (
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
              </nav>
            </section>
          ))}

          <button type="button" className="button secondary" style={{ justifyContent: 'flex-start' }} onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Signing out…' : 'Sign out admin'}
          </button>
        </div>
      </div>
    </aside>
  );
}
