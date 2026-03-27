import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  userId?: string;
  targetType?: string;
};

function toWhere(searchParams: SearchParams): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {
    NOT: { targetType: 'SYSTEM' },
  };

  if (searchParams.userId && /^\d+$/.test(searchParams.userId)) {
    where.userId = Number(searchParams.userId);
  }

  if (searchParams.targetType?.trim()) {
    where.targetType = searchParams.targetType.trim();
  }

  if (searchParams.q?.trim()) {
    const query = searchParams.q.trim();
    where.OR = [
      { action: { contains: query, mode: 'insensitive' } },
      { targetType: { contains: query, mode: 'insensitive' } },
      { targetId: { contains: query, mode: 'insensitive' } },
    ];
  }

  return where;
}

export default async function AdminAuditPage({ searchParams }: { searchParams?: SearchParams }) {
  const where = toWhere(searchParams ?? {});
  const [entries, targetTypes, recentCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.auditLog.groupBy({
      by: ['targetType'],
      where: { NOT: { targetType: 'SYSTEM' } },
      _count: { _all: true },
      orderBy: { _count: { targetType: 'desc' } },
      take: 8,
    }),
    prisma.auditLog.count({ where: { NOT: { targetType: 'SYSTEM' } } }),
  ]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Admin activity</span>
            <h1>Audit trail</h1>
          </div>
          <p>Track sensitive changes made by admins and moderators without the raw developer noise of system logs.</p>
        </div>

        <div className="card-actions" style={{ marginTop: '18px', flexWrap: 'wrap' }}>
          <span className="pill">Total audit records {recentCount}</span>
          {targetTypes.map((item) => (
            <span key={item.targetType} className="pill">{item.targetType}: {item._count._all}</span>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: '20px' }}>
        <form method="GET" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input name="q" placeholder="Search action or target" defaultValue={searchParams?.q ?? ''} />
          <input name="userId" placeholder="User ID" defaultValue={searchParams?.userId ?? ''} />
          <input name="targetType" placeholder="Target type" defaultValue={searchParams?.targetType ?? ''} />
          <button type="submit" className="button primary">Filter</button>
        </form>
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {entries.length === 0 ? (
          <p style={{ padding: '24px', margin: 0 }}>No audit records match the current filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['When', 'Action', 'Target', 'Admin', 'Snapshot'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', fontSize: '13px' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const preview = entry.newValuesJson && typeof entry.newValuesJson === 'object' && !Array.isArray(entry.newValuesJson)
                    ? JSON.stringify(entry.newValuesJson).slice(0, 180)
                    : null;

                  return (
                    <tr key={entry.id}>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <strong>{entry.action}</strong>
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <strong style={{ display: 'block' }}>{entry.targetType}</strong>
                        <span style={{ color: 'var(--muted)' }}>{entry.targetId || 'No id'}</span>
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {entry.user ? `${entry.user.username || entry.user.email} (#${entry.user.id})` : <span style={{ color: 'var(--muted)' }}>Unknown admin</span>}
                      </td>
                      <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--muted)', maxWidth: '360px' }}>
                        {preview || 'No structured snapshot'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
