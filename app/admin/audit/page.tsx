import { prisma } from '@/lib/prisma';
import { requireAdminPage } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/permissions';

function formatJson(value: unknown) {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AdminAuditPage() {
  await requireAdminPage(PERMISSIONS.auditView);

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          role: { select: { key: true, name: true } },
        },
      },
    },
  });

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Governance</span>
            <h1>Audit trail</h1>
          </div>
          <p>Recent high-value admin activity across user management, settings, and site operations.</p>
        </div>
      </section>

      <section className="card" style={{ padding: 0 }}>
        {entries.length === 0 ? (
          <p style={{ margin: 0, padding: '24px' }}>No audit records yet.</p>
        ) : (
          <div style={{ display: 'grid' }}>
            {entries.map((entry, index) => (
              <article key={entry.id} style={{ padding: '18px 20px', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span className="pill">{entry.action}</span>
                  <strong>{entry.targetType}{entry.targetId ? ` #${entry.targetId}` : ''}</strong>
                  <span style={{ color: 'var(--muted)' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
                  By {entry.user ? `${entry.user.username} (${entry.user.role?.name || entry.user.role?.key || 'unknown role'})` : 'system'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div className="card" style={{ padding: '14px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Old values</strong>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{formatJson(entry.oldValuesJson)}</pre>
                  </div>
                  <div className="card" style={{ padding: '14px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>New values</strong>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{formatJson(entry.newValuesJson)}</pre>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
