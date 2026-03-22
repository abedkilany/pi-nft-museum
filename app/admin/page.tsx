import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUserAccess } from '@/lib/permissions';
import { buildAdminSections } from '@/lib/admin-sections';
import { AdminSectionCards } from '@/components/admin/AdminSectionCards';

export default async function AdminDashboardPage() {
  const access = await getCurrentUserAccess();
  const sections = buildAdminSections(access?.permissions ?? []);

  const [usersCount, artworksCount, pendingArtworksCount, publishedCount, pagesCount, categoriesCount, countriesCount, commentsCount, reportsCount, staffCount, auditCount] = await Promise.all([
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
    prisma.auditLog.count(),
  ]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Staff Workspace</h1>
        <p style={{ opacity: 0.8, marginBottom: 0 }}>
          Professional admin control is now organized around permission-aware sections, a visible governance model,
          validated settings updates, and an audit trail for sensitive changes.
        </p>
      </div>

      <AdminSectionCards sections={sections} />

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
        <div className="card" style={{ padding: '20px' }}><h3>Audit entries</h3><p>{auditCount}</p></div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '12px' }}>Governance model</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <p style={{ margin: 0 }}><strong>Moderator:</strong> handles reports, artwork review, and community moderation.</p>
          <p style={{ margin: 0 }}><strong>Admin:</strong> manages members, content structure, publishing operations, and site settings.</p>
          <p style={{ margin: 0 }}><strong>Super Admin:</strong> manages staff access, audit visibility, and sensitive system tools.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {sections.moderation ? <Link href="/admin/artworks" className="button primary">Open review queue</Link> : null}
          {sections.moderation ? <Link href="/admin/reports" className="button secondary">Handle reports</Link> : null}
          {sections.members ? <Link href="/admin/users" className="button secondary">Review members</Link> : null}
          {sections.operations ? <Link href="/admin/settings" className="button secondary">Site operations</Link> : null}
          {sections.system ? <Link href="/admin/audit" className="button secondary">Open audit trail</Link> : null}
        </div>
      </div>
    </div>
  );
}
