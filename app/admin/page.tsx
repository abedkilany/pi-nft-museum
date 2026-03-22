import Link from 'next/link';
import { prisma } from '@/lib/prisma';

import { requireAdminPage } from '@/lib/admin';
export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [usersCount, artworksCount, pendingArtworksCount, publishedCount, pagesCount, categoriesCount, countriesCount, commentsCount, reportsCount] = await Promise.all([
    prisma.user.count(),
    prisma.artwork.count(),
    prisma.artwork.count({ where: { status: 'PENDING' } }),
    prisma.artwork.count({ where: { status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.page.count(),
    prisma.artworkCategory.count(),
    prisma.country.count(),
    prisma.artworkComment.count(),
    prisma.artworkReport.count()
  ]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Admin Dashboard</h1>
        <p style={{ opacity: 0.8 }}>Manage artworks, users, countries, comments, pages, categories, settings, and system activity from one place.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}><h3>Users</h3><p>{usersCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>All Artworks</h3><p>{artworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pending Review</h3><p>{pendingArtworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Published</h3><p>{publishedCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pages</h3><p>{pagesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Categories</h3><p>{categoriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Countries</h3><p>{countriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Comments</h3><p>{commentsCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Reports</h3><p>{reportsCount}</p></div>
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