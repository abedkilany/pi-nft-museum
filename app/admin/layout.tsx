import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminPage } from '@/lib/admin';
import { getAuthorizationSnapshot } from '@/lib/permissions';

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await requireAdminPage();
  const authz = await getAuthorizationSnapshot(user);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <AdminSidebar currentUser={{ username: user.username, role: user.role, permissions: authz.permissions }} />
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
