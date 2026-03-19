import Link from 'next/link';

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/artworks', label: 'Artworks' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/countries', label: 'Countries' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/pages', label: 'Pages' },
  { href: '/admin/system', label: 'System logs' }
];

export async function AdminSidebar() {
  return (
    <aside style={{ padding: '24px 0 24px 24px' }}>
      <div className="card" style={{ padding: '20px', position: 'sticky', top: '18px' }}>
        <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Admin control</p>
        <h2 style={{ margin: '8px 0 16px' }}>Pi NFT Museum</h2>
        <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
          <strong style={{ display: 'block' }}>Protected in frontend</strong>
          <span style={{ color: 'var(--muted)' }}>Mutations stay protected in the API.</span>
        </div>
        <nav style={{ display: 'grid', gap: '8px' }}>
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className="button secondary" style={{ justifyContent: 'flex-start' }}>{link.label}</Link>
          ))}
          <Link href="/account" className="button secondary" style={{ justifyContent: 'flex-start' }}>Back to account</Link>
        </nav>
      </div>
    </aside>
  );
}
