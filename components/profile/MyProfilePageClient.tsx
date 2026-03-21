'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { piApiFetch } from '@/lib/pi-auth-client';
import { formatTimeAgo } from '@/lib/community';
import { RequirePiAuth } from '@/components/auth/RequirePiAuth';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

export default function MyProfilePageClient() {
  const { status } = usePiAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await piApiFetch('/api/profile/me', { method: 'GET', cache: 'no-store' }).catch(() => null);
        const payload = response ? await response.json().catch(() => null) : null;
        if (cancelled) return;

        if (response?.status === 401) {
          setError('Please reconnect with Pi to load your profile.');
          setLoading(false);
          return;
        }

        if (!response?.ok || !payload?.ok) {
          setError(payload?.error || 'Failed to load profile.');
          setLoading(false);
          return;
        }

        setData(payload);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load profile.');
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated') {
    return <RequirePiAuth loadingText="Loading profile…" />;
  }

  if (loading) {
    return <div className="page-stack"><div className="card surface-section"><p>Loading profile…</p></div></div>;
  }

  if (error) {
    return <div className="page-stack"><div className="card surface-section"><p>{error}</p></div></div>;
  }

  const user = data?.user;
  const counts = data?.counts || { followers: 0, following: 0 };
  const unreadNotifications = data?.unreadNotifications || 0;
  const recentNotifications = data?.recentNotifications || [];

  if (!user) {
    return <div className="page-stack"><div className="card surface-section"><p>Profile unavailable.</p></div></div>;
  }

  const displayName = user.fullName || user.username;
  const publicCountry = user.country === '__OTHER__' ? user.customCountryName : user.country;

  return (
    <div className="page-stack">
      <section className="card" style={{ overflow: 'hidden' }}>
        <div
          className="profile-cover"
          style={{
            backgroundImage: user.coverImage
              ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${user.coverImage})`
              : undefined,
          }}
        >
          <div className="profile-avatar profile-avatar-large">
            {user.profileImage ? (
              <img src={user.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <span className="section-kicker">Member profile</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>
              @{user.username} · {user.role?.name || 'Member'}
              {publicCountry && user.showCountryPublic ? ` · ${publicCountry}` : ''}
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              {user.headline || user.bio || 'Complete your profile from Account settings to add your public bio.'}
            </p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              <Link href="/account" prefetch={false} className="button secondary">Account settings</Link>
              <Link href="/my-artworks" prefetch={false} className="button secondary">My artworks</Link>
              <Link href="/upload" className="button primary">Upload artwork</Link>
            </div>
          </div>
          <div className="profile-cover-actions">
            <Link href={`/profile/${user.username}/followers`} className="button secondary">Followers · {counts.followers}</Link>
            <Link href={`/profile/${user.username}/following`} className="button secondary">Following · {counts.following}</Link>
            <Link href="/notifications" className="button primary">Notifications · {unreadNotifications}</Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <Link href={`/profile/${user.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${user.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.following}</strong><span>Following</span></Link>
        <div className="card stat-card"><strong>{user.artworks?.length || 0}</strong><span>Recent artworks</span></div>
      </section>

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Notifications</span>
            <h2>Recent alerts</h2>
          </div>
          <p>Your latest follows, comments, approvals, and marketplace activity.</p>
        </div>
        {recentNotifications.length === 0 ? <p style={{ margin: 0 }}>No recent notifications.</p> : (
          <div className="stack-sm">
            {recentNotifications.map((notification: any) => (
              <article key={notification.id} className="card" style={{ padding: '16px' }}>
                <div className="feed-item-header">
                  <div>
                    <strong>{notification.title}</strong>
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{notification.message}</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatTimeAgo(notification.createdAt)}</span>
                </div>
                {notification.linkUrl ? <div className="card-actions" style={{ marginTop: 12 }}><Link href={notification.linkUrl} className="button secondary">Open</Link></div> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Portfolio</span>
            <h2>Latest artworks</h2>
          </div>
          <p>Your newest draft, review, premium, and published pieces in one place.</p>
        </div>
        {!user.artworks || user.artworks.length === 0 ? <p style={{ margin: 0 }}>You have not uploaded any artworks yet.</p> : (
          <div className="gallery-grid">
            {user.artworks.map((artwork: any) => (
              <article key={artwork.id} className="card art-card">
                <div className="art-image-wrap"><img src={artwork.imageUrl} alt={artwork.title} className="art-image" /></div>
                <div className="art-body">
                  <div className="art-top">
                    <div>
                      <h3>{artwork.title}</h3>
                      <p>{artwork.category?.name || 'General'}</p>
                    </div>
                    {artwork.status === 'PREMIUM' ? <PremiumBadge /> : null}
                  </div>
                  <p className="art-description">Status: {artwork.status}</p>
                  <div className="card-actions" style={{ marginTop: 16 }}>
                    <Link href={`/artwork/${artwork.id}`} className="button secondary">Open artwork</Link>
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
