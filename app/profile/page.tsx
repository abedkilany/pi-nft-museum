import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { getArtworkStatusLabel } from '@/lib/artwork-status';
import { getFollowCounts } from '@/lib/follows';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: {
      artworks: { orderBy: [{ updatedAt: 'desc' }], take: 8 },
      role: true,
      artistProfile: true
    }
  });
  if (!dbUser) redirect('/login');

  const publishedCount = dbUser.artworks.filter((item) => item.status === 'PUBLISHED').length;
  const premiumCount = dbUser.artworks.filter((item) => item.status === 'PREMIUM').length;
  const avgScore = dbUser.artworks.length > 0 ? (dbUser.artworks.reduce((sum, item) => sum + Number(item.averageRating), 0) / dbUser.artworks.length) : 0;
  const displayName = dbUser.artistProfile?.displayName || dbUser.fullName || dbUser.username;
  const followCounts = await getFollowCounts(dbUser.id);

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="profile-cover" style={{ minHeight: '240px', backgroundImage: dbUser.coverImage ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${dbUser.coverImage})` : undefined }}>
          <div className="profile-avatar profile-avatar-large">
            {dbUser.profileImage ? <img src={dbUser.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div>
            <span className="section-kicker">Creator dashboard</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>@{dbUser.username} · {dbUser.role.name}</p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{dbUser.headline || dbUser.bio || dbUser.artistProfile?.biography || 'No headline or bio has been added yet.'}</p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              <Link href={`/profile/${dbUser.username}`} className="button secondary">Open public profile</Link>
              <Link href="/account" className="button primary">Edit profile</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card"><strong>{dbUser.artworks.length}</strong><span>Total artworks</span></div>
        <div className="card stat-card"><strong>{publishedCount}</strong><span>Published</span></div>
        <div className="card stat-card"><strong>{premiumCount}</strong><span>Premium</span></div>
        <Link href={`/profile/${dbUser.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{followCounts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${dbUser.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{followCounts.following}</strong><span>Following</span></Link>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Overview</span>
            <h2>Creator summary</h2>
          </div>
          <p>Average artwork rating: {avgScore.toFixed(1)} · Joined {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(dbUser.createdAt)}</p>
        </div>
        <div className="form-grid">
          <div className="card" style={{ padding: '16px' }}><strong>Bio</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{dbUser.bio || 'No biography added yet.'}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Role</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{dbUser.role.name}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Email visibility</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{dbUser.showEmailPublic ? 'Public' : 'Private'}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Phone visibility</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{dbUser.showPhonePublic ? 'Public' : 'Private'}</p></div>
          <div className="card" style={{ padding: '16px' }}><strong>Country</strong><p style={{ marginBottom: 0, color: 'var(--muted)' }}>{dbUser.country === '__OTHER__' ? (dbUser.customCountryName || 'Other') : (dbUser.country || 'Not set')}</p></div>
        </div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Activity</span>
            <h2>Recent artworks</h2>
          </div>
          <p>Groundwork is ready for community posts, comments, and future creator activity streams.</p>
        </div>
        {dbUser.artworks.length === 0 ? <p style={{ margin: 0 }}>No artworks yet.</p> : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {dbUser.artworks.map((artwork) => (
              <div key={artwork.id} className="card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: '14px', alignItems: 'center' }}>
                <img src={artwork.imageUrl} alt={artwork.title} style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 12 }} />
                <div>
                  <strong>{artwork.title}</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{getArtworkStatusLabel(artwork.status)}</p>
                </div>
                <Link href={`/artwork/${artwork.id}`} className="button secondary">View</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
