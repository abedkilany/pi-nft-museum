import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminPage } from '@/lib/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', gap: '24px' }}>
      <AdminSidebar />
      <main style={{ padding: '32px 24px 32px 0' }}>{children}</main>
    </div>
  );
}
