export const dynamic = 'force-dynamic';

import { readSystemLogs } from '@/lib/system-log';

export default async function AdminSystemPage() {
  const logs = await readSystemLogs(300);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">System</span>
            <h1>System logs</h1>
          </div>
          <p>Review recent warnings and errors, clear logs, or download the full log file.</p>
        </div>
        <div className="card-actions">
          <a href="/api/admin/system/logs/download" className="button secondary">Download log file</a>
          <form action="/api/admin/system/logs/clear" method="POST"><button className="button primary" type="submit">Clear logs</button></form>
        </div>
      </section>

      <section className="card" style={{ padding: '0' }}>
        {logs.length === 0 ? <p style={{ padding: '24px', margin: 0 }}>No logs recorded yet.</p> : (
          <div style={{ display: 'grid' }}>
            {logs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} style={{ padding: '16px 20px', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="pill">{log.level.toUpperCase()}</span>
                  <strong>{log.message}</strong>
                </div>
                <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>{log.timestamp}</p>
                {log.meta ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{JSON.stringify(log.meta, null, 2)}</pre> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
