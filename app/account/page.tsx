'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteAccountSection } from '@/components/account/DeleteAccountSection';
import { piApiFetch } from '@/lib/pi-auth-client';

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await piApiFetch('/api/account/summary', { method: 'GET', cache: 'no-store' }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (cancelled) return;
      if (response?.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response?.ok || !payload?.ok) {
        setError(payload?.error || 'Failed to load your account.');
        setLoading(false);
        return;
      }
      setData(payload);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) return <div className="page-stack"><section className="card surface-section"><p>Loading account…</p></section></div>;
  if (error || !data?.user) return <div className="page-stack"><section className="card surface-section"><p>{error || 'Unable to load account.'}</p></section></div>;

  const dbUser = data.user;
  const isAdmin = dbUser.roleKey === 'admin' || dbUser.roleKey === 'superadmin';

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Account</span>
            <h1>Private account settings</h1>
          </div>
          <p>Profile editing now lives on your public profile page. This area is for private account details, Pi connection info, and destructive actions only.</p>
        </div>
        <div className="account-summary-grid">
          <div className="card summary-card"><strong>Pi username</strong><p style={{ color: 'var(--muted)' }}>{dbUser.piUsername || dbUser.username}</p></div>
          <div className="card summary-card"><strong>Pi UID</strong><p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{dbUser.piUid || 'Not linked yet'}</p></div>
          <div className="card summary-card"><strong>Wallet</strong><p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{dbUser.piWalletAddress || 'Not connected yet'}</p></div>
          <div className="card summary-card"><strong>Phone</strong><p style={{ color: 'var(--muted)' }}>{dbUser.phoneNumber || 'Not added yet'}</p></div>
          <div className="card summary-card"><strong>Role</strong><p style={{ color: 'var(--muted)' }}>{dbUser.roleName}</p></div>
          <div className="card summary-card"><strong>Linked at</strong><p style={{ color: 'var(--muted)' }}>{dbUser.linkedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dbUser.linkedAt)) : 'Not linked yet'}</p></div>
        </div>
        <div className="card-actions">
          <Link href={`/profile/${dbUser.username}`} className="button primary">Open public profile</Link>
          <Link href={`/profile/${dbUser.username}`} className="button secondary">Edit public profile</Link>
          <Link href="/notifications" className="button secondary">Notifications</Link>
          <Link href="/account/artworks" className="button secondary">My artworks</Link>
          <Link href="/upload" className="button secondary">Upload artwork</Link>
          {isAdmin ? <Link href="/admin" className="button secondary">Admin panel</Link> : null}
        </div>
      </section>

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Separation of concerns</span>
            <h2>What changed</h2>
          </div>
          <p>The app now keeps profile identity and private account tools separate.</p>
        </div>
        <div className="stack-sm">
          <div className="card" style={{ padding: 16 }}>
            <strong>Public profile</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>This is the only profile page visitors see. You can edit your public info directly there.</p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <strong>Account page</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>This page keeps Pi-linked account details, internal actions, and account removal only.</p>
          </div>
        </div>
      </section>

      <DeleteAccountSection />
    </div>
  );
}
