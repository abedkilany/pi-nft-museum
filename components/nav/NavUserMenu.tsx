'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

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
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) {
    return (
      <div className="nav-actions">
        <Link href="/login" className="button primary">Connect with Pi</Link>
      </div>
    );
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="button secondary" type="button" onClick={() => setOpen((value) => !value)}>
        My account · {user.username}
      </button>
      {open ? (
        <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: '240px', padding: '10px', zIndex: 40 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '6px' }}>
            <strong style={{ display: 'block' }}>{user.username}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{user.role}</span>
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <Link href="/profile" className="button secondary" style={{ justifyContent: 'flex-start' }}>Profile</Link>
            <Link href="/account" className="button secondary" style={{ justifyContent: 'flex-start' }}>Account</Link>
            <Link href="/account/artworks" className="button secondary" style={{ justifyContent: 'flex-start' }}>My artworks</Link>
            {showAdmin ? <Link href="/admin" className="button secondary" style={{ justifyContent: 'flex-start' }}>Admin panel</Link> : null}
            <button
              className="button secondary"
              type="button"
              style={{ width: '100%', justifyContent: 'flex-start' }}
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
