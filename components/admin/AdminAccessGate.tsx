'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';
import { isAdminRole } from '@/lib/roles';

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { user, status, ensureAuthenticated, error } = usePiAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'guest') {
      ensureAuthenticated().catch(() => null);
    }
  }, [ensureAuthenticated, status, pathname]);

  if (status === 'loading') {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <h1>Checking admin access…</h1>
        <p style={{ color: 'var(--muted)' }}>Verifying your Pi identity and role from the bearer token.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card" style={{ padding: '24px', display: 'grid', gap: '14px' }}>
        <h1>Admin sign-in required</h1>
        <p style={{ color: 'var(--muted)' }}>Open this page from Pi Browser and sign in with your Pi account to continue.</p>
        {error ? <p className="form-message">{error}</p> : null}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="button primary" onClick={() => ensureAuthenticated()}>Sign in with Pi</button>
          <Link href="/account" className="button secondary">Back to account</Link>
        </div>
      </div>
    );
  }

  if (!isAdminRole(user.role)) {
    return (
      <div className="card" style={{ padding: '24px', display: 'grid', gap: '14px' }}>
        <h1>Access denied</h1>
        <p style={{ color: 'var(--muted)' }}>Your Pi account is signed in, but it does not have admin access.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/account" className="button secondary">Back to account</Link>
          <button className="button primary" onClick={() => router.refresh()}>Retry</button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
