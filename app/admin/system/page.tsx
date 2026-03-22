'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

type SystemLog = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: unknown;
};

export default function AdminSystemPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'clear' | 'download' | ''>('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const [logsResponse, auditResponse] = await Promise.all([
          piApiFetch('/api/admin/system/logs', { cache: 'no-store' }).catch(() => null),
          piApiFetch('/api/admin/system/logs?type=audit', { cache: 'no-store' }).catch(() => null),
        ]);

        if (cancelled) return;

        if (!logsResponse) {
          setError('Unable to load system logs.');
          setLogs([]);
          return;
        }

        const logsPayload = await logsResponse.json().catch(() => null);
        if (!logsResponse.ok) {
          setError(logsPayload?.error || 'Failed to load system logs.');
          setLogs([]);
          return;
        }

        setLogs(Array.isArray(logsPayload?.logs) ? logsPayload.logs : []);

        if (auditResponse?.ok) {
          const auditPayload = await auditResponse.json().catch(() => null);
          setAuditCount(Array.isArray(auditPayload?.auditLogs) ? auditPayload.auditLogs.length : 0);
        } else {
          setAuditCount(0);
        }
      } catch (error) {
        console.error('Failed to load system page:', error);
        if (!cancelled) {
          setError('Something went wrong while loading system records.');
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClearLogs() {
    const confirmed = window.confirm('Clear all system log entries?');
    if (!confirmed) return;

    try {
      setBusy('clear');
      const response = await piApiFetch('/api/admin/system/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(() => null);

      if (!response) {
        setError('Unable to clear logs right now.');
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || 'Failed to clear logs.');
        return;
      }

      setLogs([]);
      setError('');
    } catch (error) {
      console.error('Failed to clear system logs:', error);
      setError('Failed to clear logs.');
    } finally {
      setBusy('');
    }
  }

  async function handleDownloadLogs() {
    try {
      setBusy('download');
      const response = await piApiFetch('/api/admin/system/logs/download', {
        method: 'GET',
      }).catch(() => null);

      if (!response) {
        setError('Unable to download the log file right now.');
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error || 'Failed to download the log file.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = disposition.match(/filename="?([^\"]+)"?/i);
      link.href = url;
      link.download = fileNameMatch?.[1] || `system-${new Date().toISOString().slice(0, 10)}.log`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setError('');
    } catch (error) {
      console.error('Failed to download system logs:', error);
      setError('Failed to download the log file.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">System</span>
            <h1>System logs</h1>
          </div>
          <p>Review recent warnings and errors, clear logs, download the log file, and jump into governance records.</p>
        </div>
        <div className="card-actions">
          <button type="button" className="button secondary" onClick={handleDownloadLogs} disabled={busy !== ''}>
            {busy === 'download' ? 'Downloading…' : 'Download log file'}
          </button>
          <Link href="/admin/audit" className="button secondary">Open audit trail ({auditCount})</Link>
          <button type="button" className="button primary" onClick={handleClearLogs} disabled={busy !== ''}>
            {busy === 'clear' ? 'Clearing…' : 'Clear logs'}
          </button>
        </div>
        {error ? <p style={{ margin: '12px 0 0', color: '#ffb4b4' }}>{error}</p> : null}
      </section>

      <section className="card" style={{ padding: '0' }}>
        {loading ? <p style={{ padding: '24px', margin: 0 }}>Loading logs…</p> : logs.length === 0 ? <p style={{ padding: '24px', margin: 0 }}>No logs recorded yet.</p> : (
          <div style={{ display: 'grid' }}>
            {logs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} style={{ padding: '16px 20px', borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
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
