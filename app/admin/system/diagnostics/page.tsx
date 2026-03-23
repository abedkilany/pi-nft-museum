'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { piApiFetch } from '@/lib/pi-auth-client';

type EndpointState = {
  loading: boolean;
  ok: boolean;
  status: number;
  payload: unknown;
  error: string;
};

type DiagnosticsMap = Record<string, EndpointState>;

const endpointLabels: Record<string, string> = {
  health: 'Health & deployment',
  auth: 'Auth diagnostics',
  admin: 'Admin access',
  db: 'Database diagnostics',
  routes: 'Route probes',
};

const endpointPaths: Record<string, string> = {
  health: '/api/debug/health',
  auth: '/api/debug/auth',
  admin: '/api/debug/admin',
  db: '/api/debug/db',
  routes: '/api/debug/routes',
};

function createInitialState(): DiagnosticsMap {
  return Object.fromEntries(
    Object.keys(endpointPaths).map((key) => [
      key,
      {
        loading: true,
        ok: false,
        status: 0,
        payload: null,
        error: '',
      },
    ])
  ) as DiagnosticsMap;
}

export default function AdminDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsMap>(createInitialState());
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadOne(key: string, path: string) {
      try {
        const response = await piApiFetch(path, { method: 'GET', cache: 'no-store' }).catch(() => null);
        if (cancelled) return;

        if (!response) {
          setDiagnostics((prev) => ({
            ...prev,
            [key]: { ...prev[key], loading: false, ok: false, status: 0, error: 'Request could not be completed.' },
          }));
          return;
        }

        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        setDiagnostics((prev) => ({
          ...prev,
          [key]: {
            loading: false,
            ok: response.ok,
            status: response.status,
            payload,
            error: response.ok ? '' : (payload as any)?.error || 'Request failed.',
          },
        }));
      } catch (error) {
        if (cancelled) return;
        setDiagnostics((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
    }

    setDiagnostics(createInitialState());
    Object.entries(endpointPaths).forEach(([key, path]) => {
      void loadOne(key, path);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Diagnostics</span>
            <h1>Admin diagnostics</h1>
          </div>
          <p>Use this panel to verify deployment details, authentication, database state, and route availability without leaving the admin workspace.</p>
        </div>
        <div className="card-actions">
          <button className="button primary" type="button" onClick={() => setRefreshToken((value) => value + 1)}>
            Refresh diagnostics
          </button>
          <Link href="/admin/system" className="button secondary">Back to system logs</Link>
          <Link href="/admin/audit" className="button secondary">Open audit trail</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '18px' }}>
        {Object.entries(endpointLabels).map(([key, label]) => {
          const entry = diagnostics[key];
          return (
            <article key={key} className="card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>{label}</strong>
                  <span style={{ color: 'var(--muted)' }}>{endpointPaths[key]}</span>
                </div>
                <span className="pill">
                  {entry.loading ? 'LOADING' : entry.ok ? `OK ${entry.status}` : `FAIL ${entry.status || '—'}`}
                </span>
              </div>

              {entry.error ? <p style={{ margin: '0 0 12px', color: '#ffb4b4' }}>{entry.error}</p> : null}
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'var(--muted)' }}>
                {entry.loading ? 'Loading…' : JSON.stringify(entry.payload, null, 2)}
              </pre>
            </article>
          );
        })}
      </section>
    </div>
  );
}
