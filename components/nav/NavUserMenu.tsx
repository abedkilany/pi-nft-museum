'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { clearPiAuthToken } from '@/lib/pi-auth-client';

type Props = {
  user: {
    username: string;
    role: string;
  } | null;
  showAdmin: boolean;
};

export function NavUserMenu({ user, showAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) {
    return (
      <div className="nav-auth">
        <Link href="/login" className="button primary nav-connect-button">
          Connect with Pi
        </Link>
      </div>
    );
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      clearPiAuthToken();

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed', error);
      alert('Logout failed. Please try again.');
      setIsLoggingOut(false);
    }
  }

  return (
    <div ref={ref} className="nav-user-menu">
      <button
        className="button secondary nav-user-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="nav-user-trigger-desktop">My account · {user.username}</span>
        <span className="nav-user-trigger-mobile">Account</span>
      </button>

      {open ? (
        <div className="card nav-user-popover" role="menu">
          <div className="nav-user-header">
            <strong>{user.username}</strong>
            <span>{user.role}</span>
          </div>

          <div className="nav-user-links">
            <Link href="/profile" className="button secondary nav-user-link">
              Profile
            </Link>
            <Link href="/account" className="button secondary nav-user-link">
              Account
            </Link>
            <Link href="/account/artworks" className="button secondary nav-user-link">
              My artworks
            </Link>
            {showAdmin ? (
              <Link href="/admin" className="button secondary nav-user-link">
                Admin panel
              </Link>
            ) : null}
            <button
              className="button secondary nav-user-link"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
