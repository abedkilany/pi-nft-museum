'use client';
import { AdminArtworksTable } from '@/components/admin/AdminArtworksTable';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminArtworksPage() {
  const { data, loading, error } = useAdminData<any[]>('/api/admin/artworks/list');
  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading pending artworks…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load artworks.'}</p></div>;
  return <AdminArtworksTable artworks={data} />;
}
