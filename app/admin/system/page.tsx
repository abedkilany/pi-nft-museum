import { readSystemLogs } from '@/lib/system-log';

export default async function AdminSystemPage() {
  const logs = await readSystemLogs(160);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Developer tools</span>
            <h1>Developer logs</h1>
          </div>
          <p>This page is kept for technical troubleshooting only. Day-to-day monitoring should happen from Error Center, Event Stream, and Audit Trail.</p>
        </div>
        <div className="card-actions">
          <a href="/admin/errors" className="button secondary">Open Error Center</a>
          <a href="/admin/events?preset=important" className="button secondary">Open important events</a>
          <a href="/admin/audit" className="button secondary">Open audit trail</a>
          <a href="/api/admin/system/logs/download" className="button secondary">Download log file</a>
          <form action="/api/admin/system/logs/clear" method="POST"><button className="button primary" type="submit">Clear developer logs</button></form>
        </div>
      </section>

      <section className="card" style={{ padding: 0 }}>
        {logs.length === 0 ? <p style={{ padding: '24px', margin: 0 }}>No logs recorded yet.</p> : (
          <div style={{ display: 'grid' }}>
            {logs.map((log, index) => {
              const meta = log.meta && typeof log.meta === 'object' && !Array.isArray(log.meta)
                ? (log.meta as Record<string, unknown>)
                : null;

              return (
                <details key={`${log.timestamp}-${index}`} style={{ padding: '16px 20px', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                  <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className="pill">{log.level.toUpperCase()}</span>
                      <strong>{log.message}</strong>
                    </div>
                    <p style={{ margin: 0, color: 'var(--muted)' }}>{log.timestamp}</p>
                  </summary>
                  {meta ? (
                    <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        {['route', 'method', 'feature', 'userId', 'requestId', 'traceId'].map((key) => (
                          meta[key] ? (
                            <div key={key} className="card" style={{ padding: '12px' }}>
                              <strong style={{ display: 'block', textTransform: 'capitalize' }}>{key}</strong>
                              <span style={{ color: 'var(--muted)' }}>{String(meta[key])}</span>
                            </div>
                          ) : null
                        ))}
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{JSON.stringify(meta, null, 2)}</pre>
                    </div>
                  ) : null}
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
