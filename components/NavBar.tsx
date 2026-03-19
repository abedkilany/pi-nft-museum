import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { getMenuItems } from '@/lib/menu';
import { isAdminRole } from '@/lib/roles';
import { NavUserMenu } from '@/components/nav/NavUserMenu';
import { NotificationBell } from '@/components/nav/NotificationBell';
import { MobileNav } from '@/components/nav/MobileNav';

export async function NavBar() {
  const user = await getCurrentUser();
  const items = await getMenuItems();

  const visibleItems = items.filter((item) => {
    if (item.enabled === false) return false;
    if (item.visibility === 'admin') return isAdminRole(user?.role);
    if (item.visibility === 'auth') return Boolean(user);
    if (item.visibility === 'guest') return !user;
    return true;
  });

  const mobileItems = visibleItems.map((item) => ({
    label: item.label,
    href: item.href
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
            user={user ? { username: user.username, role: user.role } : null}
            showAdmin={isAdminRole(user?.role)}
          />
        </div>
      </div>

      <MobileNav items={mobileItems} />
    </header>
  );
}
