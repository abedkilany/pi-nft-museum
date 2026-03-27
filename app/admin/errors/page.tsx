import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';
import { ErrorExportButtons } from '@/components/admin/ErrorExportButtons';

type SearchParams = {
  status?: string;
  severity?: string;
  source?: string;
  q?: string;
};

function toWhere(searchParams: SearchParams): Prisma.ErrorLogWhereInput {
  const where: Prisma.ErrorLogWhereInput = {};

  if (searchParams.status && ['OPEN', 'INVESTIGATING', 'RESOLVED', 'IGNORED'].includes(searchParams.status)) {
    where.status = searchParams.status as any;
  }

  if (searchParams.severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(searchParams.severity)) {
    where.severity = searchParams.severity as any;
  }

  if (searchParams.source && ['API', 'SERVER', 'CLIENT', 'REACT', 'MIDDLEWARE', 'CRON', 'UNKNOWN'].includes(searchParams.source)) {
    where.source = searchParams.source as any;
  }

  if (searchParams.q) {
    const query = searchParams.q.trim();
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { message: { contains: query, mode: 'insensitive' } },
        { route: { contains: query, mode: 'insensitive' } },
        { fingerprint: { contains: query, mode: 'insensitive' } }
      ];
    }
  }

  return where;
}

function badgeStyle(value: string) {
  if (value === 'CRITICAL' || value === 'OPEN') return { background: 'rgba(255, 92, 92, 0.16)', borderColor: 'rgba(255, 92, 92, 0.4)' };
  if (value === 'HIGH' || value === 'INVESTIGATING') return { background: 'rgba(255, 178, 92, 0.16)', borderColor: 'rgba(255, 178, 92, 0.4)' };
  if (value === 'RESOLVED') return { background: 'rgba(89, 214, 131, 0.16)', borderColor: 'rgba(89, 214, 131, 0.4)' };
  return { background: 'rgba(114, 132, 255, 0.14)', borderColor: 'rgba(114, 132, 255, 0.35)' };
}

export default async function AdminErrorsPage({ searchParams }: { searchParams?: SearchParams }) {
  const where = toWhere(searchParams ?? {});
  const [errors, _counts, latest, topRecurring, topCritical] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
      take: 200
    }),
    prisma.errorLog.groupBy({
      by: ['status'],
      _count: { _all: true }
    }),
    prisma.errorLog.findFirst({ orderBy: { lastSeenAt: 'desc' } }),
    prisma.errorLog.findMany({ orderBy: [{ occurrenceCount: 'desc' }, { lastSeenAt: 'desc' }], take: 5 }),
    prisma.errorLog.findMany({ where: { severity: 'CRITICAL', status: { in: ['OPEN', 'INVESTIGATING'] } }, orderBy: { lastSeenAt: 'desc' }, take: 5 }),
  ]);

  const summary = Object.fromEntries(_counts.map((row) => [row.status, row._count._all]));
  const exportQuery = new URLSearchParams();
  if (searchParams?.status) exportQuery.set('status', searchParams.status);
  if (searchParams?.severity) exportQuery.set('severity', searchParams.severity);
  if (searchParams?.source) exportQuery.set('source', searchParams.source);
  if (searchParams?.q) exportQuery.set('q', searchParams.q);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Observability</span>
            <h1>Error center</h1>
          </div>
          <p>Readable errors with recurrence, route context, and clear triage status. Developer logs are still available separately, but this is the main page for operational issues.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' }}>
          {[
            ['Open', summary.OPEN ?? 0],
            ['Investigating', summary.INVESTIGATING ?? 0],
            ['Resolved', summary.RESOLVED ?? 0],
            ['Ignored', summary.IGNORED ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ padding: '16px' }}>
              <strong style={{ display: 'block', fontSize: '28px' }}>{value}</strong>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="card-actions" style={{ marginTop: '18px', flexWrap: 'wrap' }}>
          <ErrorExportButtons queryString={exportQuery.toString()} />
          <Link href="/admin/system" className="button secondary">Developer logs</Link>
          <form action="/api/admin/errors/cleanup" method="POST">
            <button className="button secondary" type="submit">Clean resolved errors</button>
          </form>
          {latest ? <span className="pill">Last error {new Date(latest.lastSeenAt).toLocaleString()}</span> : <span className="pill">No tracked errors yet</span>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Most repeated</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {topRecurring.length === 0 ? <span style={{ color: 'var(--muted)' }}>No repeated errors yet.</span> : topRecurring.map((error) => (
              <Link key={error.id} href={`/admin/errors/${error.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="card" style={{ padding: '14px' }}>
                  <strong style={{ display: 'block' }}>{error.title}</strong>
                  <span style={{ color: 'var(--muted)' }}>{error.route || error.url || 'Unknown route'}</span>
                  <div className="card-actions" style={{ marginTop: '8px', gap: '8px' }}>
                    <span className="pill">Occurrences {error.occurrenceCount}</span>
                    <span className="pill">{error.severity}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Critical now</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {topCritical.length === 0 ? <span style={{ color: 'var(--muted)' }}>No open critical errors right now.</span> : topCritical.map((error) => (
              <Link key={error.id} href={`/admin/errors/${error.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="card" style={{ padding: '14px' }}>
                  <strong style={{ display: 'block' }}>{error.title}</strong>
                  <span style={{ color: 'var(--muted)' }}>{error.route || error.url || 'Unknown route'}</span>
                  <div className="card-actions" style={{ marginTop: '8px', gap: '8px' }}>
                    <span className="pill" style={badgeStyle(error.status)}>{error.status}</span>
                    <span className="pill" style={badgeStyle(error.severity)}>{error.severity}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: '20px' }}>
        <form method="GET" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input name="q" placeholder="Search title, route, fingerprint" defaultValue={searchParams?.q ?? ''} />
          <select name="status" defaultValue={searchParams?.status ?? ''}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
          <select name="severity" defaultValue={searchParams?.severity ?? ''}>
            <option value="">All severities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select name="source" defaultValue={searchParams?.source ?? ''}>
            <option value="">All sources</option>
            <option value="API">API</option>
            <option value="SERVER">Server</option>
            <option value="CLIENT">Client</option>
            <option value="REACT">React</option>
            <option value="MIDDLEWARE">Middleware</option>
            <option value="CRON">Cron</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <button type="submit" className="button primary">Filter</button>
        </form>
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {errors.length === 0 ? (
          <p style={{ padding: '24px', margin: 0 }}>No tracked errors match the current filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Status', 'Severity', 'Where', 'Summary', 'User', 'Count', 'Last seen', 'Details'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', fontSize: '13px' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {errors.map((error) => (
                  <tr key={error.id}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="pill" style={badgeStyle(error.status)}>{error.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="pill" style={badgeStyle(error.severity)}>{error.severity}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong style={{ display: 'block' }}>{error.route || error.url || 'Unknown route'}</strong>
                      <span style={{ color: 'var(--muted)' }}>{error.source}{error.method ? ` • ${error.method}` : ''}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: '280px' }}>
                      <strong style={{ display: 'block' }}>{error.title}</strong>
                      <span style={{ color: 'var(--muted)' }}>{error.readableSummary || error.message}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {error.user ? (
                        <span>{error.user.username || error.user.email}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>Guest / unknown</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{error.occurrenceCount}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {new Date(error.lastSeenAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <Link href={`/admin/errors/${error.id}`} className="button secondary">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
