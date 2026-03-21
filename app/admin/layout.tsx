'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { piApiFetch } from '@/lib/pi-auth-client';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      const response = await piApiFetch('/api/account/summary', {
        method: 'GET',
        cache: 'no-store',
      }).catch(() => null);

      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;

      if (response?.status === 401) {
        router.replace('/login');
        return;
      }

      const roleKey = payload?.user?.roleKey;
      if (response?.ok && payload?.ok && roleKey && ADMIN_ROLES.has(roleKey)) {
        setStatus('allowed');
        return;
      }

      setStatus('blocked');
      router.replace('/account');
    }

    void loadAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status !== 'allowed') {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>{status === 'blocked' ? 'Redirecting…' : 'Checking admin access…'}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <AdminSidebar />
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
