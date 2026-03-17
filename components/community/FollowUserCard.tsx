import Link from 'next/link';
import { FollowButton } from '@/components/community/FollowButton';

type UserCardProps = {
  user: {
    id: number;
    username: string;
    fullName: string | null;
    headline: string | null;
    profileImage: string | null;
  };
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
};

export function FollowUserCard({ user, isFollowing, followsYou, isSelf }: UserCardProps) {
  const displayName = user.fullName || user.username;

  return (
    <div className="card" style={{ padding: '16px', display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '14px', alignItems: 'center' }}>
      <Link href={`/profile/${user.username}`} style={{ display: 'inline-flex', width: 72, height: 72, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: 24 }}>
        {user.profileImage ? (
          <img src={user.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{displayName.slice(0, 1).toUpperCase()}</span>
        )}
      </Link>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/profile/${user.username}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>{displayName}</Link>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>@{user.username}</span>
          {followsYou && !isSelf ? <span className="pill">Follows you</span> : null}
          {isFollowing && followsYou ? <span className="pill">Mutual</span> : null}
        </div>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{user.headline || 'No headline yet.'}</p>
      </div>
      <FollowButton targetUserId={user.id} isFollowing={isFollowing} followsYou={followsYou} isSelf={isSelf} />
    </div>
  );
}
