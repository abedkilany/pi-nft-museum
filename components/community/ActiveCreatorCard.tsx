import Link from 'next/link';
import { FollowButton } from '@/components/community/FollowButton';

type Props = {
  creator: {
    id: number;
    username: string;
    fullName: string | null;
    headline: string | null;
    profileImage: string | null;
    stats: {
      posts: number;
      artworks: number;
      followers: number;
    };
  };
  isFollowing: boolean;
  followsYou: boolean;
  isSelf: boolean;
};

export function ActiveCreatorCard({ creator, isFollowing, followsYou, isSelf }: Props) {
  const displayName = creator.fullName || creator.username;

  return (
    <article className="card" style={{ padding: 18, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link
          href={`/profile/${creator.username}`}
          className="profile-avatar"
          style={{ width: 56, height: 56, textDecoration: 'none', flexShrink: 0 }}
        >
          {creator.profileImage ? (
            <img src={creator.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </Link>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link href={`/profile/${creator.username}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit' }}>
              {displayName}
            </Link>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>@{creator.username}</span>
            {followsYou && !isSelf ? <span className="pill">Follows you</span> : null}
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', lineHeight: 1.5 }}>
            {creator.headline || 'Creator in the community feed.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span className="pill">{creator.stats.posts} post{creator.stats.posts === 1 ? '' : 's'}</span>
        <span className="pill">{creator.stats.artworks} artwork{creator.stats.artworks === 1 ? '' : 's'}</span>
        <span className="pill">{creator.stats.followers} follower{creator.stats.followers === 1 ? '' : 's'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={`/profile/${creator.username}`} className="button secondary">View profile</Link>
        <FollowButton targetUserId={creator.id} isFollowing={isFollowing} followsYou={followsYou} isSelf={isSelf} />
      </div>
    </article>
  );
}
