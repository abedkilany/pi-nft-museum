'use client';

import { useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminSystemPage() {
  const { data, loading, error, reload } = useAdminData<any[]>('/api/admin/system/logs');
  const [message, setMessage] = useState('');

  async function clearLogs() {
    setMessage('');
    const response = await piApiFetch('/api/admin/system/logs/clear', { method: 'POST' });
    setMessage(response.ok ? 'Logs cleared.' : 'Failed to clear logs.');
    if (response.ok) reload();
  }

  async function downloadLogs() {
    setMessage('');
    const response = await piApiFetch('/api/admin/system/logs/download', { method: 'GET' });
    if (!response.ok) {
      setMessage('Failed to download log file.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'system.log';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading system logs…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load system logs.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact"><div><span className="section-kicker">System</span><h1>System logs</h1></div><p>Review recent warnings and errors and clear logs through bearer-authenticated requests.</p></div>
        <div className="card-actions"><button className="button secondary" type="button" onClick={downloadLogs}>Download log file</button><button className="button primary" type="button" onClick={clearLogs}>Clear logs</button></div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
      <section className="card" style={{ padding: '0' }}>
        {data.length === 0 ? <p style={{ padding: '24px', margin: 0 }}>No logs recorded yet.</p> : <div style={{ display: 'grid' }}>{data.map((log: any, index: number) => <div key={`${log.timestamp}-${index}`} style={{ padding: '16px 20px', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}><div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px' }}><span className="pill">{String(log.level).toUpperCase()}</span><strong>{log.message}</strong></div><p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>{log.timestamp}</p>{log.meta ? <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{JSON.stringify(log.meta, null, 2)}</pre> : null}</div>)}</div>}
      </section>
    </div>
  );
}
