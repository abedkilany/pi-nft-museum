'use client';
import { PageBuilder } from '@/components/admin/PageBuilder';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminPagesPage() {
  const { data, loading, error } = useAdminData<any[]>('/api/admin/pages/list');
  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading pages…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load pages.'}</p></div>;
  return <PageBuilder pages={data} />;
}
