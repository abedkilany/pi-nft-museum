'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { piApiFetch } from '@/lib/pi-auth-client';
import { formatTimeAgo } from '@/lib/community';
import { getDisplayName, getInitials, getPublicCountry, getStatusLabel } from '@/lib/profile';

type ProfileArtwork = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  category?: { id: number; name: string } | null;
};

type ProfileUser = {
  id: number;
  username: string;
  fullName: string | null;
  bio: string | null;
  country: string | null;
  customCountryName: string | null;
  headline: string | null;
  profileImage: string | null;
  coverImage: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  showCountryPublic: boolean;
  role?: { key: string; name: string } | null;
  artworks: ProfileArtwork[];
};

type ProfilePayload = {
  ok: boolean;
  user: ProfileUser;
  counts: { followers: number; following: number };
  unreadNotifications: number;
  recentNotifications: Array<{
    id: number;
    title: string;
    message: string;
    linkUrl?: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  artworkTotals: {
    total: number;
    published: number;
    premium: number;
    underReview: number;
    rejected: number;
    drafted: number;
    minted: number;
  };
};

function ProfileSkeleton() {
  return (
    <div className="page-stack">
      <section className="card surface-section">
        <p>Loading profile…</p>
      </section>
    </div>
  );
}

export default function MyProfilePageClient() {
  const router = useRouter();
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await piApiFetch('/api/profile/me', { method: 'GET', cache: 'no-store' }).catch(() => null);
        const payload = response ? await response.json().catch(() => null) : null;
        if (cancelled) return;

        if (response?.status === 401) {
          router.replace('/login');
          return;
        }

        if (!response?.ok || !payload?.ok) {
          setError(payload?.error || 'Failed to load profile.');
          setLoading(false);
          return;
        }

        setData(payload as ProfilePayload);
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
  }, [router]);

  const user = data?.user;
  const counts = data?.counts || { followers: 0, following: 0 };
  const artworkTotals = data?.artworkTotals;
  const unreadNotifications = data?.unreadNotifications || 0;
  const recentNotifications = data?.recentNotifications || [];

  const displayName = useMemo(() => (user ? getDisplayName(user) : ''), [user]);
  const publicCountry = useMemo(() => (user ? getPublicCountry(user) : ''), [user]);

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return <div className="page-stack"><div className="card surface-section"><p>{error}</p></div></div>;
  }

  if (!user) {
    return <div className="page-stack"><div className="card surface-section"><p>Profile unavailable.</p></div></div>;
  }

  const quickLinks = [
    user.websiteUrl ? { href: user.websiteUrl, label: 'Website' } : null,
    user.twitterUrl ? { href: user.twitterUrl, label: 'X / Twitter' } : null,
    user.instagramUrl ? { href: user.instagramUrl, label: 'Instagram' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

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
              <span>{getInitials(displayName)}</span>
            )}
          </div>
          <div>
            <span className="section-kicker">Member profile</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>
              @{user.username} · {user.role?.name || 'Member'}
              {publicCountry ? ` · ${publicCountry}` : ''}
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              {user.headline || user.bio || 'Complete your profile from Account settings to add your public bio.'}
            </p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              <Link href="/account" className="button secondary">Account settings</Link>
              <Link href="/artwork" className="button secondary">My artworks</Link>
              <Link href="/upload" className="button primary">Upload artwork</Link>
            </div>
            {quickLinks.length > 0 ? (
              <div className="card-actions" style={{ marginTop: 12 }}>
                {quickLinks.map((item) => (
                  <a key={item.label} className="button secondary" href={item.href} target="_blank" rel="noreferrer">
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
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
        <div className="card stat-card"><strong>{artworkTotals?.total || user.artworks.length}</strong><span>Total artworks</span></div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card"><strong>{artworkTotals?.published || 0}</strong><span>Published</span></div>
        <div className="card stat-card"><strong>{artworkTotals?.premium || 0}</strong><span>Premium</span></div>
        <div className="card stat-card"><strong>{artworkTotals?.underReview || 0}</strong><span>Under review</span></div>
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
            {recentNotifications.map((notification) => (
              <article key={notification.id} className="card" style={{ padding: '16px' }}>
                <div className="feed-item-header">
                  <div>
                    <strong>{notification.title}</strong>
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{notification.message}</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatTimeAgo(notification.createdAt)}</span>
                </div>
                <div className="inline-stats" style={{ marginTop: 12 }}>
                  <span>{notification.isRead ? 'Read' : 'Unread'}</span>
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
        {user.artworks.length === 0 ? <p style={{ margin: 0 }}>You have not uploaded any artworks yet.</p> : (
          <div className="gallery-grid">
            {user.artworks.map((artwork) => (
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
                  <p className="art-description">{artwork.description}</p>
                  <div className="inline-stats">
                    <span>{getStatusLabel(artwork.status)}</span>
                    <span>{formatTimeAgo(artwork.publishedAt || artwork.createdAt)}</span>
                  </div>
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
