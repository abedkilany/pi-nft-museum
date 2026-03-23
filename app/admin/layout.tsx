import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminClientGate } from '@/components/admin/AdminClientGate';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminClientGate>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <AdminSidebar />
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </AdminClientGate>
  );
}
