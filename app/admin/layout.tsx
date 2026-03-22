'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { piApiFetch } from '@/lib/pi-auth-client';

type AdminLayoutProps = {
  children: ReactNode;
};

type AccessStatus = 'loading' | 'allowed' | 'blocked';

type AccessPayload = {
  ok?: boolean;
  access?: {
    sections?: {
      moderation?: boolean;
      members?: boolean;
      content?: boolean;
      operations?: boolean;
      system?: boolean;
    };
  };
};

function isPathAllowed(pathname: string, payload: AccessPayload | null) {
  if (!payload?.access?.sections) return false;
  const sections = payload.access.sections;

  if (pathname === '/admin') return true;
  if (pathname.startsWith('/admin/artworks') || pathname.startsWith('/admin/reports')) return Boolean(sections.moderation);
  if (pathname.startsWith('/admin/users')) return Boolean(sections.members);
  if (pathname.startsWith('/admin/categories') || pathname.startsWith('/admin/countries') || pathname.startsWith('/admin/menu') || pathname.startsWith('/admin/pages')) return Boolean(sections.content);
  if (pathname.startsWith('/admin/settings')) return Boolean(sections.operations);
  if (pathname.startsWith('/admin/system')) return Boolean(sections.system);
  return true;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AccessStatus>('loading');
  const [message, setMessage] = useState('Checking staff access…');

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      try {
        const response = await piApiFetch('/api/admin/access-summary', {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setStatus('blocked');
          setMessage('Unable to verify your session. Redirecting…');
          router.replace('/login');
          return;
        }

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (response.status === 401) {
          setStatus('blocked');
          setMessage('Your session needs to be refreshed. Redirecting…');
          router.replace('/login');
          return;
        }

        if (response.ok && payload?.ok === true) {
          if (!isPathAllowed(pathname, payload)) {
            setStatus('blocked');
            setMessage('This staff section is outside your current permissions. Redirecting…');
            router.replace('/admin');
            return;
          }
          setStatus('allowed');
          return;
        }

        setStatus('blocked');
        setMessage('You do not have access to the staff workspace. Redirecting…');
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
