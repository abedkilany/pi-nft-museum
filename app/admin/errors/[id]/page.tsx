import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ErrorExportButtons } from '@/components/admin/ErrorExportButtons';
import { ErrorStatusForm } from '@/components/admin/ErrorStatusForm';

const badgeStyles: Record<string, CSSProperties> = {
  OPEN: { background: 'rgba(255, 92, 92, 0.16)', borderColor: 'rgba(255, 92, 92, 0.4)' },
  INVESTIGATING: { background: 'rgba(255, 178, 92, 0.16)', borderColor: 'rgba(255, 178, 92, 0.4)' },
  RESOLVED: { background: 'rgba(89, 214, 131, 0.16)', borderColor: 'rgba(89, 214, 131, 0.4)' },
  IGNORED: { background: 'rgba(114, 132, 255, 0.14)', borderColor: 'rgba(114, 132, 255, 0.35)' }
};

export default async function AdminErrorDetailPage({ params }: { params: { id: string } }) {
  const error = await prisma.errorLog.findUnique({
    where: { id: Number(params.id) },
    include: { user: { select: { id: true, username: true, email: true } } }
  });

  if (!error) notFound();

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Error details</span>
            <h1>{error.title}</h1>
          </div>
          <p>{error.readableSummary || error.message}</p>
        </div>

        <div className="card-actions" style={{ flexWrap: 'wrap' }}>
          <Link href="/admin/errors" className="button secondary">Back to error center</Link>
          <ErrorExportButtons id={error.id} />
          {error.sentryEventId ? <span className="pill">Sentry event {error.sentryEventId}</span> : <span className="pill">No Sentry event id</span>}
        </div>
      </section>

      <section className="card" style={{ padding: '20px' }}>
        <ErrorStatusForm errorId={error.id} currentStatus={error.status} />
      </section>

      <section className="card" style={{ padding: '20px', display: 'grid', gap: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span className="pill" style={badgeStyles[error.status]}>{error.status}</span>
          <span className="pill">{error.severity}</span>
          <span className="pill">{error.source}</span>
          {error.method ? <span className="pill">{error.method}</span> : null}
          <span className="pill">Occurrences {error.occurrenceCount}</span>
        </div>

        <div className="form-grid">
          <div>
            <strong>Route / URL</strong>
            <p style={{ color: 'var(--muted)' }}>{error.route || error.url || 'Unknown route'}</p>
          </div>
          <div>
            <strong>User</strong>
            <p style={{ color: 'var(--muted)' }}>{error.user ? `${error.user.username || error.user.email} (#${error.user.id})` : 'Guest / unknown'}</p>
          </div>
          <div>
            <strong>First seen</strong>
            <p style={{ color: 'var(--muted)' }}>{new Date(error.firstSeenAt).toLocaleString()}</p>
          </div>
          <div>
            <strong>Last seen</strong>
            <p style={{ color: 'var(--muted)' }}>{new Date(error.lastSeenAt).toLocaleString()}</p>
          </div>
          <div>
            <strong>Environment</strong>
            <p style={{ color: 'var(--muted)' }}>{error.environment || 'Unknown'}</p>
          </div>
          <div>
            <strong>Release</strong>
            <p style={{ color: 'var(--muted)' }}>{error.release || 'Not set'}</p>
          </div>
          <div>
            <strong>HTTP status</strong>
            <p style={{ color: 'var(--muted)' }}>{error.httpStatus ?? 'N/A'}</p>
          </div>
          <div>
            <strong>Request id</strong>
            <p style={{ color: 'var(--muted)' }}>{error.requestId || 'N/A'}</p>
          </div>
        </div>

        <div>
          <strong>Message</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{error.message}</pre>
        </div>

        {error.stack ? (
          <div>
            <strong>Stack trace</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: 'var(--muted)' }}>{error.stack}</pre>
          </div>
        ) : null}

        {error.componentStack ? (
          <div>
            <strong>Component stack</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: 'var(--muted)' }}>{error.componentStack}</pre>
          </div>
        ) : null}

        {error.tagsJson ? (
          <div>
            <strong>Tags</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: 'var(--muted)' }}>{JSON.stringify(error.tagsJson, null, 2)}</pre>
          </div>
        ) : null}

        {error.extraJson ? (
          <div>
            <strong>Extra data</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: 'var(--muted)' }}>{JSON.stringify(error.extraJson, null, 2)}</pre>
          </div>
        ) : null}

        {error.lastPayloadJson ? (
          <div>
            <strong>Last payload snapshot</strong>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: 'var(--muted)' }}>{JSON.stringify(error.lastPayloadJson, null, 2)}</pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}
