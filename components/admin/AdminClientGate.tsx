'use client';

import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

export function AdminClientGate({ children }: { children: React.ReactNode }) {
  return (
    <RequirePiAuth loadingText="Loading admin session…" guestText="Please connect with Pi using an admin account to open the admin panel.">
      <AdminRoleGate>{children}</AdminRoleGate>
    </RequirePiAuth>
  );
}

function AdminRoleGate({ children }: { children: React.ReactNode }) {
  const { user } = usePiAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <section className="card surface-section">
          <p>Your Pi account is connected, but it does not currently have admin access.</p>
          <p style={{ color: 'var(--muted)' }}>To unlock the dashboard, keep your account mapped to the admin or superadmin role in the database or in the Pi admin environment variables.</p>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
