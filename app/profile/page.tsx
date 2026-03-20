import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowCounts } from '@/lib/follows';
import { getUnreadNotificationCount } from '@/lib/notifications';
import { PremiumBadge } from '@/components/shared/PremiumBadge';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    include: {
      role: true,
      artworks: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { category: true },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const [counts, unreadNotifications, recentNotifications] = await Promise.all([
    getFollowCounts(user.id),
    getUnreadNotificationCount(user.id),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const displayName = user.fullName || user.username;
  const publicCountry = user.country === '__OTHER__' ? user.customCountryName : user.country;

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div
          className="profile-cover"
          style={{
            minHeight: '240px',
            backgroundImage: user.coverImage
              ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${user.coverImage})`
              : undefined,
            position: 'relative',
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
              @{user.username} · {user.role.name}
              {publicCountry && user.showCountryPublic ? ` · ${publicCountry}` : ''}
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
              {user.headline || user.bio || 'Complete your profile from Account settings to add your public bio.'}
            </p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              <Link href="/account" className="button secondary">Account settings</Link>
              <Link href="/artwork" className="button secondary">My artworks</Link>
              <Link href="/upload" className="button primary">Upload artwork</Link>
            </div>
          </div>
          <div style={{ position: 'absolute', right: 24, bottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link href={`/profile/${user.username}/followers`} className="button secondary">Followers · {counts.followers}</Link>
            <Link href={`/profile/${user.username}/following`} className="button secondary">Following · {counts.following}</Link>
            <Link href="/notifications" className="button primary">Notifications{unreadNotifications ? ` · ${unreadNotifications}` : ''}</Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <Link href={`/profile/${user.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${user.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.following}</strong><span>Following</span></Link>
        <div className="card stat-card"><strong>{user.artworks.length}</strong><span>Recent artworks</span></div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">My notifications</span>
            <h2>Inbox snapshot</h2>
          </div>
          <p>{unreadNotifications} unread notification{unreadNotifications === 1 ? '' : 's'}</p>
        </div>
        {recentNotifications.length === 0 ? (
          <p style={{ margin: 0 }}>No notifications yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recentNotifications.map((notification) => (
              <article key={notification.id} className="card" style={{ padding: '16px' }}>
                <strong>{notification.title}</strong>
                <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{notification.message}</p>
                <div className="card-actions" style={{ marginTop: 12 }}>
                  {notification.linkUrl ? <Link href={notification.linkUrl} className="button secondary">Open</Link> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Latest uploads</span>
            <h2>Recent artworks</h2>
          </div>
          <p>Private overview of your latest drafts and published pieces.</p>
        </div>
        {user.artworks.length === 0 ? (
          <p style={{ margin: 0 }}>You have not uploaded any artworks yet.</p>
        ) : (
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
