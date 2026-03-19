import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: '100vh', gap: '24px' }}>
      <AdminSidebar />
      <main style={{ padding: '32px 24px 32px 0' }}>{children}</main>
    </div>
  );
}
