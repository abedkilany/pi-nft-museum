import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function AdminDashboardPage() {
  const [usersCount, artworksCount, pendingArtworksCount, publishedCount, pagesCount, categoriesCount, countriesCount, commentsCount, reportsCount, staffCount] = await Promise.all([
    prisma.user.count(),
    prisma.artwork.count(),
    prisma.artwork.count({ where: { status: 'PENDING' } }),
    prisma.artwork.count({ where: { status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.page.count(),
    prisma.artworkCategory.count(),
    prisma.country.count(),
    prisma.artworkComment.count(),
    prisma.artworkReport.count(),
    prisma.user.count({ where: { role: { key: { in: ['moderator', 'admin', 'superadmin'] } } } }),
  ]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Staff Workspace</h1>
        <p style={{ opacity: 0.8 }}>
          The admin area is now organized around moderation, members, content, operations, and governance.
          Moderators can focus on review queues and reports, admins can run content and operations, and super admins keep control of staff and logs.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}><h3>Members</h3><p>{usersCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Staff accounts</h3><p>{staffCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>All artworks</h3><p>{artworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Review queue</h3><p>{pendingArtworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Published</h3><p>{publishedCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Reports</h3><p>{reportsCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pages</h3><p>{pagesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Categories</h3><p>{categoriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Countries</h3><p>{countriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Comments</h3><p>{commentsCount}</p></div>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '12px' }}>Governance model</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <p style={{ margin: 0 }}><strong>Moderator:</strong> handles reports, artwork review, and community moderation.</p>
          <p style={{ margin: 0 }}><strong>Admin:</strong> manages members, content structure, publishing operations, and site settings.</p>
          <p style={{ margin: 0 }}><strong>Super Admin:</strong> manages staff access, permissions, audit visibility, and sensitive system tools.</p>
        </div>
      </div>
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/admin/artworks" className="button primary">Open review queue</Link>
          <Link href="/admin/reports" className="button secondary">Handle reports</Link>
          <Link href="/admin/users" className="button secondary">Review members</Link>
          <Link href="/admin/settings" className="button secondary">Site operations</Link>
          <Link href="/admin/system" className="button secondary">Governance & logs</Link>
        </div>
      </div>
    </div>
  );
}
