import Link from 'next/link';
import { FollowButton } from '@/components/community/FollowButton';
import { getDisplayImageUrl } from '@/lib/image-url';

type Props = {
  creator: {
    id: number;
    username: string;
    fullName: string | null;
    headline: string | null;
    profileImage: string | null;
    score: number;
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
    <article className="card" style={{ padding: 14, display: 'grid', gap: 10, alignContent: 'start' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link
          href={`/profile/${creator.username}`}
          className="profile-avatar"
          style={{ width: 56, height: 56, textDecoration: 'none', flexShrink: 0 }}
        >
          {creator.profileImage ? (
            <img src={getDisplayImageUrl(creator.profileImage)} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', lineHeight: 1.45, fontSize: 14 }}>
            {(creator.headline || 'Creator in the community feed.').slice(0, 72)}{(creator.headline || '').length > 72 ? '…' : ''}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="pill">{creator.stats.posts} posts</span>
        <span className="pill">{creator.stats.artworks} artworks</span>
        <span className="pill">{creator.stats.followers} followers</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href={`/profile/${creator.username}`} className="button secondary">{isSelf ? 'Your profile' : 'View profile'}</Link>
        {!isSelf ? <FollowButton targetUserId={creator.id} isFollowing={isFollowing} followsYou={followsYou} isSelf={isSelf} /> : null}
      </div>
    </article>
  );
}
