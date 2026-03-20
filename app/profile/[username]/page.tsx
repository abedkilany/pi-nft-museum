import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PiConnectButton } from '@/components/PiConnectButton';
import { prisma } from '@/lib/prisma';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowCounts, getFollowState } from '@/lib/follows';
import { FollowButton } from '@/components/community/FollowButton';
import { formatTimeAgo } from '@/lib/community';
import { getDisplayName, getInitials, getPublicCountry, getStatusLabel, publicProfileUserSelect } from '@/lib/profile';

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const currentUser = await getCurrentUser();
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: publicProfileUserSelect,
  });

  if (!user) notFound();

  const displayName = getDisplayName(user);
  const publicCountry = getPublicCountry(user);

  const [counts, followState, activities] = await Promise.all([
    getFollowCounts(user.id),
    getFollowState(currentUser?.userId ?? null, user.id),
    prisma.communityActivity.findMany({
      where: { OR: [{ actorId: user.id }, { subjectUserId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        message: true,
        linkUrl: true,
        createdAt: true,
      },
    }),
  ]);

  const publicLinks = [
    user.websiteUrl ? { href: user.websiteUrl, label: 'Website' } : null,
    user.twitterUrl ? { href: user.twitterUrl, label: 'X / Twitter' } : null,
    user.instagramUrl ? { href: user.instagramUrl, label: 'Instagram' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div className="page-stack">
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="profile-cover" style={{ backgroundImage: user.coverImage ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${user.coverImage})` : undefined }}>
          <div className="profile-avatar profile-avatar-large">
            {user.profileImage ? <img src={user.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{getInitials(displayName)}</span>}
          </div>
          <div>
            <span className="section-kicker">Public creator profile</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>@{user.username} · {user.role.name}{publicCountry ? ` · ${publicCountry}` : ''}</p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{user.headline || user.bio || 'No public bio has been added yet.'}</p>
            {publicLinks.length > 0 ? (
              <div className="card-actions" style={{ marginTop: 16 }}>
                {publicLinks.map((item) => (
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
            {!followState.isSelf ? (
              currentUser ? (
                <FollowButton
                  targetUserId={user.id}
                  isFollowing={followState.isFollowing}
                  followsYou={followState.followsYou}
                  isSelf={followState.isSelf}
                />
              ) : (
                <PiConnectButton className="button primary">Login with Pi to follow</PiConnectButton>
              )
            ) : null}
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <Link href={`/profile/${user.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${user.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.following}</strong><span>Following</span></Link>
        <div className="card stat-card"><strong>{user.artworks.length}</strong><span>Public artworks</span></div>
      </section>

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Community</span>
            <h2>Recent activity</h2>
          </div>
          <p>Followers, comments, replies, and likes build each creator&apos;s public story.</p>
        </div>
        {activities.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>No public activity yet.</p> : (
          <div className="stack-sm">
            {activities.map((activity) => (
              <article key={activity.id} className="card" style={{ padding: '16px' }}>
                <div className="feed-item-header">
                  <div>
                    <strong>{activity.title}</strong>
                    <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{activity.message}</p>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatTimeAgo(activity.createdAt)}</span>
                </div>
                {activity.linkUrl ? <div className="card-actions" style={{ marginTop: 12 }}><Link href={activity.linkUrl} className="button secondary">Open</Link></div> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Published works</span>
            <h2>Gallery</h2>
          </div>
          <p>{user.artworks.length} public artwork{user.artworks.length === 1 ? '' : 's'}</p>
        </div>
        {user.artworks.length === 0 ? <p style={{ margin: 0 }}>No public artworks yet.</p> : (
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
