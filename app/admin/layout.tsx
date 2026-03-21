'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ensurePiUserSession, piApiFetch } from '@/lib/pi-auth-client';

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
  const pathname = usePathname();
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [message, setMessage] = useState('Checking admin access…');

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      try {
        await ensurePiUserSession(['username', 'payments']);

        const response = await piApiFetch('/api/account/summary', {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setStatus('blocked');
          setMessage('Unable to verify your Pi session. Redirecting…');
          router.replace('/login');
          return;
        }

        const payload = await readJsonSafe(response);
        if (cancelled) return;

        if (response.status === 401) {
          setStatus('blocked');
          setMessage('Your Pi session could not be verified. Redirecting…');
          router.replace('/login');
          return;
        }

        const roleKey = String(payload?.user?.roleKey ?? '').trim().toLowerCase();
        if (response.ok && payload?.ok === true && ADMIN_ROLES.has(roleKey)) {
          setStatus('allowed');
          return;
        }

        setStatus('blocked');
        setMessage('You do not have access to the admin area. Redirecting…');
        router.replace('/account');
      } catch (error) {
        console.error('Admin access check failed:', error);
        if (cancelled) return;
        setStatus('blocked');
        setMessage('Something went wrong while opening admin. Redirecting…');
        router.replace('/account');
      }
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (status !== 'allowed') {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>{message}</p>
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
