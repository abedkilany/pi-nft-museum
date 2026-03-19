'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { MenuItem } from '@/lib/menu';
import { isAdminRole } from '@/lib/roles';
import { piApiFetch } from '@/lib/pi-auth-client';
import { NavUserMenu } from '@/components/nav/NavUserMenu';
import { NotificationBell } from '@/components/nav/NotificationBell';
import { MobileNav } from '@/components/nav/MobileNav';

type AuthUser = {
  username: string;
  role: string;
} | null;

type Props = {
  items: MenuItem[];
};

export function NavBarClient({ items }: Props) {
  const [user, setUser] = useState<AuthUser>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const response = await piApiFetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;

      if (cancelled) return;

      if (response?.ok && payload?.authenticated && payload?.user) {
        setUser({
          username: payload.user.username,
          role: payload.user.role,
        });
      } else {
        setUser(null);
      }

      setCheckedAuth(true);
    }

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (item.enabled === false) return false;
      if (item.visibility === 'admin') return isAdminRole(user?.role);
      if (item.visibility === 'auth') return Boolean(user);
      if (item.visibility === 'guest') return checkedAuth ? !user : true;
      return true;
    });
  }, [checkedAuth, items, user]);

  const mobileItems = visibleItems.map((item) => ({
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
          {visibleItems.map((item) => (
            <Link key={`${item.label}-${item.href}`} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? <NotificationBell /> : null}
          <NavUserMenu
            user={user}
            showAdmin={isAdminRole(user?.role)}
          />
        </div>
      </div>

      <MobileNav items={mobileItems} />
    </header>
  );
}
