import Link from 'next/link';
import type { AdminSectionKey } from '@/lib/admin-sections';

const SECTION_META: Record<AdminSectionKey, { title: string; description: string; href: string }> = {
  moderation: {
    title: 'Moderation',
    description: 'Artwork review, reports, and community moderation.',
    href: '/admin/artworks',
  },
  members: {
    title: 'Members',
    description: 'User lifecycle, staff roles, and profile governance.',
    href: '/admin/users',
  },
  content: {
    title: 'Content',
    description: 'Pages, categories, countries, and navigation structure.',
    href: '/admin/pages',
  },
  operations: {
    title: 'Operations',
    description: 'Site settings and publishing controls.',
    href: '/admin/settings',
  },
  system: {
    title: 'Governance',
    description: 'System logs, audit visibility, and sensitive oversight.',
    href: '/admin/system',
  },
};

export function AdminSectionCards({ sections }: { sections: Record<AdminSectionKey, boolean> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
      {Object.entries(sections).map(([key, allowed]) => {
        const meta = SECTION_META[key as AdminSectionKey];
        return (
          <div key={key} className="card" style={{ padding: '20px', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{meta.title}</h3>
              <span className="pill">{allowed ? 'Enabled' : 'Hidden'}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{meta.description}</p>
            {allowed ? <Link href={meta.href} className="button secondary">Open</Link> : <span style={{ color: 'var(--muted)' }}>Access is not assigned to your role.</span>}
          </div>
        );
      })}
    </div>
  );
}
