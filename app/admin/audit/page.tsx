'use client';

import { useEffect, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

type AuditEntry = {
  id: number;
  action: string;
  targetType: string;
  targetId: string | null;
  oldValuesJson: unknown;
  newValuesJson: unknown;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
    role?: {
      key: string;
      name: string;
    } | null;
  } | null;
};

function formatJson(value: unknown) {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadAudit() {
      try {
        setLoading(true);
        setError('');

        const response = await piApiFetch('/api/admin/system/logs?type=audit', {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setError('تعذر التحقق من الجلسة أو تحميل سجل التدقيق.');
          setEntries([]);
          return;
        }

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setError(payload?.error || 'فشل تحميل سجل التدقيق.');
          setEntries([]);
          return;
        }

        const auditEntries = Array.isArray(payload?.auditLogs) ? payload.auditLogs : [];
        setEntries(auditEntries);
      } catch (error) {
        console.error('Failed to load audit trail:', error);
        if (!cancelled) {
          setError('حدث خطأ أثناء تحميل سجل التدقيق.');
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAudit();

    return () => {
      cancelled = true;
    };
  }, []);

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
        {loading ? (
          <p style={{ margin: 0, padding: '24px' }}>Loading audit records…</p>
        ) : error ? (
          <p style={{ margin: 0, padding: '24px', color: '#ffb4b4' }}>{error}</p>
        ) : entries.length === 0 ? (
          <p style={{ margin: 0, padding: '24px' }}>No audit records yet.</p>
        ) : (
          <div style={{ display: 'grid' }}>
            {entries.map((entry, index) => (
              <article
                key={entry.id}
                style={{
                  padding: '18px 20px',
                  borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '8px',
                  }}
                >
                  <span className="pill">{entry.action}</span>
                  <strong>
                    {entry.targetType}
                    {entry.targetId ? ` #${entry.targetId}` : ''}
                  </strong>
                  <span style={{ color: 'var(--muted)' }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
                  By{' '}
                  {entry.user
                    ? `${entry.user.username} (${entry.user.role?.name || entry.user.role?.key || 'unknown role'})`
                    : 'system'}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div className="card" style={{ padding: '14px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Old values</strong>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {formatJson(entry.oldValuesJson)}
                    </pre>
                  </div>

                  <div className="card" style={{ padding: '14px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>New values</strong>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                      {formatJson(entry.newValuesJson)}
                    </pre>
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
