'use client';

import Link from 'next/link';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminDashboardPage() {
  const { data, loading, error } = useAdminData<{
    usersCount: number;
    artworksCount: number;
    pendingArtworksCount: number;
    publishedCount: number;
    pagesCount: number;
    categoriesCount: number;
    countriesCount: number;
    commentsCount: number;
    reportsCount: number;
  }>('/api/admin/dashboard');

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading dashboard…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load dashboard.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Admin Dashboard</h1>
        <p style={{ opacity: 0.8 }}>Manage artworks, users, countries, comments, pages, categories, settings, and system activity from one place.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}><h3>Users</h3><p>{data.usersCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>All Artworks</h3><p>{data.artworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pending Review</h3><p>{data.pendingArtworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Published</h3><p>{data.publishedCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pages</h3><p>{data.pagesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Categories</h3><p>{data.categoriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Countries</h3><p>{data.countriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Comments</h3><p>{data.commentsCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Reports</h3><p>{data.reportsCount}</p></div>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/admin/artworks" className="button primary">Review Artworks</Link>
          <Link href="/admin/users" className="button secondary">Manage Users</Link>
          <Link href="/admin/countries" className="button secondary">Manage Countries</Link>
          <Link href="/admin/reports" className="button secondary">Review Reports</Link>
          <Link href="/admin/categories" className="button secondary">Manage Categories</Link>
          <Link href="/admin/system" className="button secondary">System Logs</Link>
        </div>
      </div>
    </div>
  );
}
