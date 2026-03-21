'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { MenuItem } from '@/lib/menu';
import { isAdminRole } from '@/lib/roles';
import { NavUserMenu } from '@/components/nav/NavUserMenu';
import { NotificationBell } from '@/components/nav/NotificationBell';
import { MobileNav } from '@/components/nav/MobileNav';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type Props = {
  items: MenuItem[];
};

export function NavBarClient({ items }: Props) {
  const { user, status } = usePiAuth();
  const checkedAuth = status !== 'loading';

  const visibleItems = useMemo(() => {
    return items.filter((item: any) => {
      if (item.enabled === false) return false;
      if (item.visibility === 'admin') return isAdminRole(user?.role);
      if (item.visibility === 'auth') return Boolean(user);
      if (item.visibility === 'guest') return checkedAuth ? !user : true;
      return true;
    });
  }, [checkedAuth, items, user]);

  const mobileItems = visibleItems.map((item: any) => ({
    label: item.label,
    href: item.href,
  }));

  return (
    <header className="topbar">
      <div className="topbar-main">
        <Link href="/" className="brand">
          <span className="brand-icon">🏛️</span>
          <span className="brand-text">Pi NFT Museum</span>
        </Link>

        <nav className="navlinks navlinks-desktop">
          {visibleItems.map((item: any) => (
            <Link key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? <NotificationBell /> : null}
          <NavUserMenu user={user} showAdmin={isAdminRole(user?.role)} />
        </div>
      </div>

      <MobileNav items={mobileItems} />
    </header>
  );
}
