import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminAccessGate } from '@/components/admin/AdminAccessGate';
import { AdminGrantPropagator } from '@/components/admin/AdminGrantPropagator';
import { requireAdminPage } from '@/lib/admin';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPage();

  return (
    <AdminAccessGate>
      <AdminGrantPropagator />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <AdminSidebar />
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </AdminAccessGate>
  );
}
