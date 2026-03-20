'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileForms } from '@/components/account/ProfileForms';
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
  const countries = data.countries || [];
  const isAdmin = dbUser.roleKey === 'admin' || dbUser.roleKey === 'superadmin';

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Account hub</span>
            <h1>My Account</h1>
          </div>
          <p>Manage your Pi-linked profile, privacy, and marketplace access from one place.</p>
        </div>
        <div className="account-summary-grid">
          <div className="card summary-card"><strong>Pi username</strong><p style={{ color: 'var(--muted)' }}>{dbUser.piUsername || dbUser.username}</p></div>
          <div className="card summary-card"><strong>Pi UID</strong><p style={{ color: 'var(--muted)', wordBreak: 'break-all' }}>{dbUser.piUid || 'Not linked yet'}</p></div>
          <div className="card summary-card"><strong>Phone</strong><p style={{ color: 'var(--muted)' }}>{dbUser.phoneNumber || 'Not added yet'}</p></div>
          <div className="card summary-card"><strong>Country</strong><p style={{ color: 'var(--muted)' }}>{dbUser.country === '__OTHER__' ? (dbUser.customCountryName || 'Other country') : (dbUser.country || 'Not set')}</p></div>
          <div className="card summary-card"><strong>Role</strong><p style={{ color: 'var(--muted)' }}>{dbUser.roleName}</p></div>
          <div className="card summary-card"><strong>Linked at</strong><p style={{ color: 'var(--muted)' }}>{dbUser.linkedAt ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dbUser.linkedAt)) : 'Not linked yet'}</p></div>
        </div>
        <div className="card-actions">
          <Link href={`/profile/${dbUser.username}`} className="button secondary">Open public profile</Link>
          <Link href="/profile" className="button secondary">Open member dashboard</Link>
          <Link href="/artwork" className="button secondary">My artworks</Link>
          <Link href="/upload" className="button primary">Upload artwork</Link>
          {isAdmin ? <Link href="/admin" className="button secondary">Admin panel</Link> : null}
        </div>
      </section>

      <ProfileForms user={dbUser} countries={countries} />
      <DeleteAccountSection />
    </div>
  );
}
