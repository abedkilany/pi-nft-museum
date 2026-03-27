import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/domains/system';
import { safeAppEventQuery } from '@/lib/app-events';

export const dynamic = 'force-dynamic';

type SearchParams = {
  category?: string;
  status?: string;
  source?: string;
  userId?: string;
  q?: string;
  preset?: string;
};

const noisyEventNames = ['PAGE_VIEWED', 'BUTTON_CLICKED', 'LINK_CLICKED', 'FORM_SUBMITTED', 'AUTH_ME_START', 'AUTH_ME_CONFIRMED'];

function toWhere(searchParams: SearchParams): Prisma.AppEventWhereInput {
  const where: Prisma.AppEventWhereInput = {};
  const preset = searchParams.preset || 'important';

  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.source) where.source = searchParams.source;
  if (searchParams.userId && /^\d+$/.test(searchParams.userId)) where.userId = Number(searchParams.userId);

  if (searchParams.q?.trim()) {
    const query = searchParams.q.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { readableSummary: { contains: query, mode: 'insensitive' } },
      { message: { contains: query, mode: 'insensitive' } },
      { route: { contains: query, mode: 'insensitive' } },
      { traceId: { contains: query, mode: 'insensitive' } },
      { requestId: { contains: query, mode: 'insensitive' } },
      { entityId: { contains: query, mode: 'insensitive' } }
    ];
  }

  if (preset === 'important') {
    where.AND = [
      {
        OR: [
          { status: { in: ['FAILED', 'WARNING'] } },
          { category: { in: ['ERROR', 'AUDIT'] } },
          { severity: { in: ['HIGH', 'CRITICAL'] } },
          { feature: 'admin' },
          { feature: 'security' },
        ],
      },
      { name: { notIn: noisyEventNames } },
    ];
  }

  if (preset === 'errors') {
    where.AND = [
      { OR: [{ status: 'FAILED' }, { category: 'ERROR' }] },
      { name: { notIn: noisyEventNames } },
    ];
  }

  if (preset === 'all') {
    where.AND = [{ name: { notIn: [] } }];
  }

  return where;
}

function badgeStyle(value: string | null | undefined) {
  if (value === 'FAILED' || value === 'CRITICAL') return { background: 'rgba(255, 92, 92, 0.16)', borderColor: 'rgba(255, 92, 92, 0.4)' };
  if (value === 'WARNING' || value === 'HIGH') return { background: 'rgba(255, 178, 92, 0.16)', borderColor: 'rgba(255, 178, 92, 0.4)' };
  if (value === 'SUCCESS') return { background: 'rgba(89, 214, 131, 0.16)', borderColor: 'rgba(89, 214, 131, 0.4)' };
  return { background: 'rgba(114, 132, 255, 0.14)', borderColor: 'rgba(114, 132, 255, 0.35)' };
}

function humanSummary(event: any) {
  return event.readableSummary || event.message || `${event.name} on ${event.route || event.feature || 'system'}`;
}

export default async function AdminEventsPage({ searchParams }: { searchParams?: SearchParams }) {
  const currentParams = searchParams ?? {};
  const preset = currentParams.preset || 'important';
  const where = toWhere(currentParams);

  const [events, groupedStatus, groupedCategory, latest, totalImportant] = await Promise.all([
    safeAppEventQuery(() => prisma.appEvent.findMany({
      where,
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 180,
    }), []),
    safeAppEventQuery(() => prisma.appEvent.groupBy({ by: ['status'], where, _count: { _all: true } }), []),
    safeAppEventQuery(() => prisma.appEvent.groupBy({ by: ['category'], where, _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 6 }), []),
    safeAppEventQuery(() => prisma.appEvent.findFirst({ orderBy: { createdAt: 'desc' } }), null),
    safeAppEventQuery(() => prisma.appEvent.count({ where: toWhere({ preset: 'important' }) }), 0),
  ]);

  const statusSummary = Object.fromEntries(groupedStatus.map((row) => [row.status, row._count._all]));

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Observability</span>
            <h1>Event stream</h1>
          </div>
          <p>Focused event monitoring. This page now prioritizes warnings, failures, audit actions, and admin-impacting activity instead of every small click.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '18px' }}>
          {[
            ['Important', totalImportant],
            ['Failed', statusSummary.FAILED ?? 0],
            ['Warning', statusSummary.WARNING ?? 0],
            ['Success', statusSummary.SUCCESS ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="card" style={{ padding: '16px' }}>
              <strong style={{ display: 'block', fontSize: '28px' }}>{value}</strong>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="card-actions" style={{ marginTop: '18px', flexWrap: 'wrap' }}>
          <a href="/admin/events?preset=important" className={`button ${preset === 'important' ? 'primary' : 'secondary'}`}>Important only</a>
          <a href="/admin/events?preset=errors" className={`button ${preset === 'errors' ? 'primary' : 'secondary'}`}>Errors only</a>
          <a href="/admin/events?preset=all" className={`button ${preset === 'all' ? 'primary' : 'secondary'}`}>All structured events</a>
          <form action="/api/admin/events/cleanup" method="POST">
            <button className="button secondary" type="submit">Clean old events</button>
          </form>
          {latest ? <span className="pill">Last event {new Date(latest.createdAt).toLocaleString()}</span> : null}
        </div>
      </section>

      <section className="card" style={{ padding: '20px' }}>
        <form method="GET" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input type="hidden" name="preset" value={preset} />
          <input name="q" placeholder="Search event, route, trace, entity" defaultValue={currentParams.q ?? ''} />
          <input name="userId" placeholder="User ID" defaultValue={currentParams.userId ?? ''} />
          <select name="category" defaultValue={currentParams.category ?? ''}>
            <option value="">All categories</option>
            <option value="USER_ACTION">User action</option>
            <option value="SYSTEM_FLOW">System flow</option>
            <option value="ERROR">Error</option>
            <option value="AUDIT">Audit</option>
          </select>
          <select name="status" defaultValue={currentParams.status ?? ''}>
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="STARTED">Started</option>
            <option value="WARNING">Warning</option>
            <option value="FAILED">Failed</option>
          </select>
          <select name="source" defaultValue={currentParams.source ?? ''}>
            <option value="">All sources</option>
            <option value="CLIENT">Client</option>
            <option value="API">API</option>
            <option value="SERVER">Server</option>
            <option value="REACT">React</option>
          </select>
          <button type="submit" className="button primary">Filter</button>
        </form>
      </section>

      <section className="card" style={{ padding: '20px' }}>
        <div className="card-actions" style={{ flexWrap: 'wrap' }}>
          {groupedCategory.map((row) => (
            <span key={row.category} className="pill">{row.category}: {row._count._all}</span>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {events.length === 0 ? (
          <p style={{ padding: '24px', margin: 0 }}>No events match the current filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['When', 'Status', 'Category', 'What happened', 'Route', 'User', 'Trace'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)', fontSize: '13px' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{new Date(event.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="pill" style={badgeStyle(event.status)}>{event.status}</span>
                      {event.severity ? <span className="pill" style={{ ...badgeStyle(event.severity), marginInlineStart: 8 }}>{event.severity}</span> : null}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong style={{ display: 'block' }}>{event.category}</strong>
                      <span style={{ color: 'var(--muted)' }}>{event.type}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: '320px' }}>
                      <strong style={{ display: 'block' }}>{event.name}</strong>
                      <span style={{ color: 'var(--muted)' }}>{humanSummary(event)}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <strong style={{ display: 'block' }}>{event.route || event.feature || 'Unknown route'}</strong>
                      <span style={{ color: 'var(--muted)' }}>{event.source || 'Unknown source'}{event.method ? ` • ${event.method}` : ''}</span>
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {event.user ? <span>{event.user.username || event.user.email}</span> : <span style={{ color: 'var(--muted)' }}>Guest / system</span>}
                    </td>
                    <td style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                      {event.traceId || event.requestId || '—'}
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
