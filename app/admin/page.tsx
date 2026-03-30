import { ArtworkStatus } from '@/types/enums';
import Link from 'next/link';
import { prisma } from '@/lib/domains/system';
import { safeAppEventQuery } from '@/lib/app-events';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [
    usersCount,
    pendingArtworksCount,
    publishedCount,
    reportsOpenCount,
    openErrorsCount,
    investigatingErrorsCount,
    pagesCount,
    recentAuditCount,
    importantEventsCount,
    latestError,
    latestAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.artwork.count({ where: { status: ArtworkStatus.PENDING_REVIEW } }),
    prisma.artwork.count({ where: { status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.artworkReport.count({ where: { status: 'OPEN' } }).catch(() => 0),
    prisma.errorLog.count({ where: { status: 'OPEN' } }),
    prisma.errorLog.count({ where: { status: 'INVESTIGATING' } }),
    prisma.page.count(),
    prisma.auditLog.count({ where: { targetType: { not: 'SYSTEM' } } }),
    safeAppEventQuery(() => prisma.appEvent.count({ where: { OR: [{ status: { in: ['FAILED', 'WARNING'] } }, { category: { in: ['AUDIT', 'ERROR'] } }] } }), 0),
    prisma.errorLog.findFirst({ orderBy: { lastSeenAt: 'desc' } }),
    prisma.auditLog.findFirst({ where: { targetType: { not: 'SYSTEM' } }, include: { user: { select: { id: true, username: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  const cards = [
    { title: 'Pending artworks', value: pendingArtworksCount, hint: 'Need review or decision' },
    { title: 'Published artworks', value: publishedCount, hint: 'Live in the museum' },
    { title: 'Open reports', value: reportsOpenCount, hint: 'Community reports waiting' },
    { title: 'Open errors', value: openErrorsCount, hint: 'Need attention now' },
    { title: 'Investigating', value: investigatingErrorsCount, hint: 'Already under review' },
    { title: 'Users', value: usersCount, hint: 'All registered members' },
    { title: 'Audit records', value: recentAuditCount, hint: 'Admin activity history' },
    { title: 'Important events', value: importantEventsCount, hint: 'Warnings, errors, and audit' },
    { title: 'Pages', value: pagesCount, hint: 'Ready for fast publishing' },
  ];

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Admin overview</span>
            <h1>Operational dashboard</h1>
          </div>
          <p>Focus on moderation, platform issues, and recent admin activity. Technical developer logs were moved out of the main workflow.</p>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {cards.map((card) => (
          <div key={card.title} className="card" style={{ padding: '18px' }}>
            <strong style={{ display: 'block', fontSize: '32px', marginBottom: '8px' }}>{card.value}</strong>
            <div style={{ fontWeight: 700 }}>{card.title}</div>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{card.hint}</span>
          </div>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Quick actions</h2>
          <div className="card-actions" style={{ flexWrap: 'wrap' }}>
            <Link href="/admin/artworks" className="button primary">Review artworks</Link>
            <Link href="/admin/reports" className="button secondary">Review reports</Link>
            <Link href="/admin/errors" className="button secondary">Open error center</Link>
            <Link href="/admin/events?preset=important" className="button secondary">Important events</Link>
            <Link href="/admin/audit" className="button secondary">Audit trail</Link>
            <Link href="/admin/users" className="button secondary">Manage users</Link>
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Latest error</h2>
          {latestError ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              <strong>{latestError.title}</strong>
              <span style={{ color: 'var(--muted)' }}>{latestError.route || latestError.url || 'Unknown route'}</span>
              <span className="pill">{latestError.status}</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{new Date(latestError.lastSeenAt).toLocaleString()}</span>
              <Link href={`/admin/errors/${latestError.id}`} className="button secondary" style={{ width: 'fit-content' }}>Open error</Link>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>No tracked errors yet.</p>
          )}
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Latest admin activity</h2>
          {latestAudit ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              <strong>{latestAudit.action}</strong>
              <span style={{ color: 'var(--muted)' }}>{latestAudit.targetType}{latestAudit.targetId ? ` #${latestAudit.targetId}` : ''}</span>
              <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {latestAudit.user ? `${latestAudit.user.username || latestAudit.user.email}` : 'Unknown admin'} • {new Date(latestAudit.createdAt).toLocaleString()}
              </span>
              <Link href="/admin/audit" className="button secondary" style={{ width: 'fit-content' }}>Open audit trail</Link>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>No audit records yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}