import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { getCurrentUser } from '@/lib/current-user';
import { ADMIN_ROLES } from '@/lib/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !ADMIN_ROLES.includes(currentUser.role as (typeof ADMIN_ROLES)[number])) {
    redirect('/account');
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
