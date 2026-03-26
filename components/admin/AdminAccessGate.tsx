'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

const ADMIN_ROLES = new Set(['superadmin', 'admin', 'moderator', 'reviewer']);

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, status } = usePiAuth();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/account');
      return;
    }

    if (status === 'authenticated' && !ADMIN_ROLES.has(user?.role || '')) {
      router.replace('/account');
    }
  }, [router, status, user?.role]);

  if (status === 'loading') {
    return (
      <div className="card" style={{ padding: 24 }}>
        <p style={{ margin: 0 }}>Checking your admin access…</p>
      </div>
    );
  }

  if (status !== 'authenticated' || !ADMIN_ROLES.has(user?.role || '')) {
    return (
      <div className="card" style={{ padding: 24 }}>
        <p style={{ margin: 0 }}>Admin access is required.</p>
      </div>
    );
  }

  return <>{children}</>;
}
