'use client';

import { useEffect, useState } from 'react';
import { AdminSectionCards } from '@/components/admin/AdminSectionCards';
import type { AdminSectionKey } from '@/lib/admin-sections';
import { piApiFetch } from '@/lib/pi-auth-client';

const EMPTY_SECTIONS: Record<AdminSectionKey, boolean> = {
  moderation: false,
  members: false,
  content: false,
  operations: false,
  system: false,
};

type DashboardPayload = {
  ok?: boolean;
  access?: {
    sections?: Record<AdminSectionKey, boolean>;
  };
  stats?: {
    usersCount: number;
    artworksCount: number;
    pendingArtworksCount: number;
    publishedCount: number;
    pagesCount: number;
    categoriesCount: number;
    countriesCount: number;
    commentsCount: number;
    reportsCount: number;
    staffCount: number;
    auditCount: number;
  };
};

const EMPTY_STATS: NonNullable<DashboardPayload['stats']> = {
  usersCount: 0,
  artworksCount: 0,
  pendingArtworksCount: 0,
  publishedCount: 0,
  pagesCount: 0,
  categoriesCount: 0,
  countriesCount: 0,
  commentsCount: 0,
  reportsCount: 0,
  staffCount: 0,
  auditCount: 0,
};

export default function AdminDashboardPage() {
  const [sections, setSections] = useState<Record<AdminSectionKey, boolean>>(EMPTY_SECTIONS);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');

        const response = await piApiFetch('/api/admin/dashboard', {
          method: 'GET',
          cache: 'no-store',
        }).catch(() => null);

        if (cancelled) return;

        if (!response) {
          setError('تعذر تحميل بيانات لوحة التحكم.');
          return;
        }

        const payload = (await response.json().catch(() => null)) as DashboardPayload | null;

        if (!response.ok || payload?.ok !== true) {
          setError('فشل تحميل بيانات لوحة التحكم.');
          return;
        }

        setSections(payload.access?.sections ?? EMPTY_SECTIONS);
        setStats(payload.stats ?? EMPTY_STATS);
      } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        if (!cancelled) {
          setError('حدث خطأ أثناء تحميل لوحة التحكم.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Staff Workspace</h1>
        <p style={{ opacity: 0.8, marginBottom: 0 }}>
          Professional admin control is now organized around permission-aware sections, a visible governance model,
          validated settings updates, and an audit trail for sensitive changes.
        </p>
      </div>

      {error ? (
        <div className="card" style={{ padding: '20px', color: '#ffb4b4' }}>{error}</div>
      ) : null}

      <AdminSectionCards sections={sections} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}><h3>Members</h3><p>{loading ? '…' : stats.usersCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Staff accounts</h3><p>{loading ? '…' : stats.staffCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>All artworks</h3><p>{loading ? '…' : stats.artworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Review queue</h3><p>{loading ? '…' : stats.pendingArtworksCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Published</h3><p>{loading ? '…' : stats.publishedCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Reports</h3><p>{loading ? '…' : stats.reportsCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Pages</h3><p>{loading ? '…' : stats.pagesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Categories</h3><p>{loading ? '…' : stats.categoriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Countries</h3><p>{loading ? '…' : stats.countriesCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Comments</h3><p>{loading ? '…' : stats.commentsCount}</p></div>
        <div className="card" style={{ padding: '20px' }}><h3>Audit entries</h3><p>{loading ? '…' : stats.auditCount}</p></div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ marginBottom: '12px' }}>Governance model</h2>
        <p style={{ marginBottom: '12px', color: 'var(--muted)' }}>
          This dashboard now reads the current staff session from the browser token instead of relying on a server-side page request.
          That keeps admin visibility aligned with the same authenticated session used by the rest of the staff workspace.
        </p>
        <ul style={{ margin: 0, paddingInlineStart: '20px', color: 'var(--muted)' }}>
          <li>Dashboard visibility follows the same permission summary used by the sidebar.</li>
          <li>Superadmin keeps full effective access even if database permissions drift.</li>
          <li>Audit and system pages now read through protected API endpoints using the Pi access token.</li>
        </ul>
      </div>
    </div>
  );
}
