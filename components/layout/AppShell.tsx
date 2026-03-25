'use client';

import { Suspense, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PiScript } from '@/components/PiScript';
import { PiAuthProvider } from '@/components/auth/PiAuthProvider';
import { ErrorMonitorClient } from '@/components/error/ErrorMonitorClient';
import { AppEventClient } from '@/components/analytics/AppEventClient';

function isAdminRoute(pathname: string | null) {
  if (!pathname) return false;
  return pathname === '/admin-login' || pathname.startsWith('/admin');
}

export function AppShell({ children, nav }: { children: ReactNode; nav: ReactNode }) {
  const pathname = usePathname();
  const adminMode = isAdminRoute(pathname);

  if (adminMode) {
    return (
      <>
        <ErrorMonitorClient />
        <Suspense fallback={null}>
          <AppEventClient />
        </Suspense>
        {children}
      </>
    );
  }

  return (
    <>
      <PiScript />
      <PiAuthProvider>
        <ErrorMonitorClient />
        <Suspense fallback={null}>
          <AppEventClient />
        </Suspense>
        <div className="page-shell">
          {nav}
          <main className="container">{children}</main>
        </div>
      </PiAuthProvider>
    </>
  );
}
