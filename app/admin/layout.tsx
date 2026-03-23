import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminAccessGate } from '@/components/admin/AdminAccessGate';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAccessGate>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <AdminSidebar />
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </AdminAccessGate>
  );
}
