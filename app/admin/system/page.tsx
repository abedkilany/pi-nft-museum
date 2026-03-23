'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { piApiFetch } from '@/lib/pi-auth-client';

type SystemLogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: unknown;
};

type SystemPayload = {
  ok?: boolean;
  logs?: SystemLogEntry[];
};

type DashboardPayload = {
  ok?: boolean;
  stats?: {
    auditCount?: number;
  };
};

export default function AdminSystemPage() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');

    try {
      const [logsResponse, dashboardResponse] = await Promise.all([
        piApiFetch('/api/admin/system/logs', { method: 'GET', cache: 'no-store' }).catch(() => null),
        piApiFetch('/api/admin/dashboard', { method: 'GET', cache: 'no-store' }).catch(() => null),
      ]);

      if (!logsResponse) {
        setError('فشل تحميل سجلات النظام.');
        setLogs([]);
        return;
      }

      const logsPayload = (await logsResponse.json().catch(() => null)) as SystemPayload | null;
      if (!logsResponse.ok) {
        setError('فشل تحميل سجلات النظام.');
        setLogs([]);
      } else {
        setLogs(Array.isArray(logsPayload?.logs) ? logsPayload.logs : []);
      }

      if (dashboardResponse?.ok) {
        const dashboardPayload = (await dashboardResponse.json().catch(() => null)) as DashboardPayload | null;
        setAuditCount(dashboardPayload?.stats?.auditCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to load system logs:', error);
      setError('حدث خطأ أثناء تحميل سجلات النظام.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleClearLogs() {
    try {
      setWorking(true);
      setError('');

      const response = await piApiFetch('/api/admin/system/logs/clear', {
        method: 'POST',
      }).catch(() => null);

      if (!response || !response.ok) {
        setError('تعذر مسح سجلات النظام.');
        return;
      }

      await loadAll();
    } catch (error) {
      console.error('Failed to clear system logs:', error);
      setError('حدث خطأ أثناء مسح السجلات.');
    } finally {
      setWorking(false);
    }
  }

  async function handleDownloadLogs() {
    try {
      setWorking(true);
      setError('');

      const response = await piApiFetch('/api/admin/system/logs/download', {
        method: 'GET',
      }).catch(() => null);

      if (!response || !response.ok) {
        setError('تعذر تنزيل ملف السجلات.');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-${new Date().toISOString().slice(0, 10)}.log`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download system logs:', error);
      setError('حدث خطأ أثناء تنزيل ملف السجلات.');
    } finally {
      setWorking(false);
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
          <button onClick={handleDownloadLogs} className="button secondary" type="button" disabled={working}>
            Download log file
          </button>
          <Link href="/admin/audit" className="button secondary">Open audit trail ({auditCount})</Link>
          <button onClick={handleClearLogs} className="button primary" type="button" disabled={working}>
            Clear logs
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
