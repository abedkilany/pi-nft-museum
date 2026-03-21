'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { piApiFetch } from '@/lib/pi-auth-client';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

type AdminLayoutProps = {
  children: ReactNode;
};

type AccessStatus = 'loading' | 'allowed' | 'blocked';

async function readJsonSafe(response: Response | null) {
  if (!response) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AccessStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      try {
        const response = await piApiFetch('/api/account/summary', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setStatus('blocked');
          router.replace('/login');
          return;
        }

        if (response.status === 401) {
          setStatus('blocked');
          router.replace('/login');
          return;
        }

        const payload = await readJsonSafe(response);
        if (cancelled) return;

        const roleKey = String(payload?.user?.roleKey ?? '').toLowerCase();
        if (response.ok && payload?.ok === true && ADMIN_ROLES.has(roleKey)) {
          setStatus('allowed');
          return;
        }

        setStatus('blocked');
        router.replace('/account');
      } catch (error) {
        console.error('Admin access check failed:', error);
        if (cancelled) return;
        setStatus('blocked');
        router.replace('/account');
      }
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
      <main className="admin-content">{children}</main>
    </div>
  );
}
