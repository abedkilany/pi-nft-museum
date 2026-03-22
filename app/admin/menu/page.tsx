'use client';
import { MenuEditor } from '@/components/admin/MenuEditor';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminMenuPage() {
  const { data, loading, error } = useAdminData<any[]>('/api/admin/menu/list');
  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading menu…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load menu.'}</p></div>;
  return <MenuEditor initialItems={data} />;
}
