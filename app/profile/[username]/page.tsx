import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PiConnectButton } from '@/components/PiConnectButton';
import { prisma } from '@/lib/prisma';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { getCurrentUser } from '@/lib/current-user';
import { getFollowCounts, getFollowState } from '@/lib/follows';
import { FollowButton } from '@/components/community/FollowButton';
import { scoreCommunityPost } from '@/lib/community';
import { getAllowedCountries } from '@/lib/countries';
import PublicProfileCommunityTabs from '@/components/profile/PublicProfileCommunityTabs';
import ProfileEditPanel from '@/components/profile/ProfileEditPanel';
import type { CommunityFeedPost } from '@/components/community/PostCard';

export const dynamic = 'force-dynamic';

type SerializableArtwork = {
  id: number;
  title: string;
  imageUrl: string;
  status: string;
  price: string;
  currency: string;
} | null;

function serializeArtwork(artwork: {
  id: number;
  title: string;
  imageUrl: string;
  status: unknown;
  price: { toString(): string } | number | string | null;
  currency: string;
} | null): SerializableArtwork {
  if (!artwork) return null;
  return {
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    status: String(artwork.status),
    price: artwork.price == null ? '0' : artwork.price.toString(),
    currency: artwork.currency,
  };
}

function serializeComments(comments: Array<any>) {
  const byId = new Map<number, any>();
  const roots: any[] = [];

  for (const comment of comments) {
    byId.set(comment.id, {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      authorId: comment.authorId,
      parentId: comment.parentId,
      author: comment.author,
      replies: [],
    });
  }

  for (const comment of comments) {
    const serialized = byId.get(comment.id);
    if (!serialized) continue;
    if (comment.parentId) {
      const parent = byId.get(comment.parentId);
      if (parent) {
        parent.replies.push(serialized);
      } else {
        roots.push(serialized);
      }
    } else {
      roots.push(serialized);
    }
  }

  return roots;
}

function serializePost(post: any, viewerId: number | null): CommunityFeedPost {
  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    viewerLiked: viewerId ? post.likes.length > 0 : false,
    authorId: post.authorId,
    author: post.author,
    artwork: serializeArtwork(post.artwork),
    comments: serializeComments(post.comments),
    feedScore: scoreCommunityPost({
      createdAt: post.createdAt,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      linkedArtwork: Boolean(post.artworkId),
    }),
  };
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const currentUser = await getCurrentUser();
  const viewerId = currentUser?.userId ?? null;

  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: {
      role: true,
      artworks: {
        where: { status: { in: ['PUBLISHED', 'PREMIUM'] } },
        orderBy: { publishedAt: 'desc' },
        take: 12,
        include: { category: true }
      },
    }
  });

  if (!user) notFound();
  const displayName = user.fullName || user.username;
  const publicCountry = user.country === '__OTHER__' ? user.customCountryName : user.country;

  const commonPostInclude = {
    author: {
      select: {
        username: true,
        fullName: true,
        profileImage: true,
        headline: true,
      },
    },
    artwork: {
      select: {
        id: true,
        title: true,
        imageUrl: true,
        status: true,
        price: true,
        currency: true,
      },
    },
    comments: {
      orderBy: { createdAt: 'asc' as const },
      take: 30,
      include: {
        author: {
          select: {
            username: true,
            fullName: true,
            profileImage: true,
          },
        },
      },
    },
    likes: viewerId ? {
      where: { userId: viewerId },
      select: { id: true },
    } : false,
  };

  const [counts, followState, publicPostCount, ownPostsRaw, likedPostLikesRaw, activitiesRaw, commentsAuthoredCount, countries] = await Promise.all([
    getFollowCounts(user.id),
    getFollowState(viewerId, user.id),
    prisma.communityPost.count({ where: { authorId: user.id, isPublished: true } }),
    prisma.communityPost.findMany({
      where: { authorId: user.id, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: commonPostInclude,
    }),
    prisma.communityPostLike.findMany({
      where: {
        userId: user.id,
        post: { isPublished: true },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        post: {
          include: commonPostInclude,
        },
      },
    }),
    prisma.communityActivity.findMany({
      where: { OR: [{ actorId: user.id }, { subjectUserId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.communityPostComment.count({ where: { authorId: user.id } }),
    getAllowedCountries(),
  ]);

  const ownPosts = ownPostsRaw.map((post) => serializePost(post, viewerId));
  const likedPosts = likedPostLikesRaw
    .map((entry) => entry.post)
    .filter((post, index, array) => array.findIndex((candidate) => candidate.id === post.id) === index)
    .map((post) => serializePost(post, viewerId));

  const recentRepliesAndComments = await prisma.communityPostComment.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: {
      post: {
        select: {
          id: true,
          body: true,
          author: {
            select: {
              username: true,
              fullName: true,
            },
          },
        },
      },
    },
  });

  const activityItems = [
    ...activitiesRaw.map((activity) => ({
      id: `activity-${activity.id}`,
      kind: 'activity' as const,
      title: activity.title,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
      linkUrl: activity.linkUrl,
    })),
    ...recentRepliesAndComments.map((comment) => ({
      id: `comment-${comment.id}`,
      kind: comment.parentId ? 'reply' as const : 'comment' as const,
      title: comment.parentId ? 'Replied in community' : 'Commented in community',
      message: `${comment.body}

On ${comment.post.author.fullName || comment.post.author.username}'s post.`,
      createdAt: comment.createdAt.toISOString(),
      linkUrl: `/community`,
    })),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 12);

  return (
    <div className="page-stack">
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="profile-cover" style={{ backgroundImage: user.coverImage ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${user.coverImage})` : undefined }}>
          <div className="profile-avatar profile-avatar-large">
            {user.profileImage ? <img src={user.profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{displayName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div>
            <span className="section-kicker">Public creator profile</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>@{user.username} · {user.role.name}{publicCountry && user.showCountryPublic ? ` · ${publicCountry}` : ''}</p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{user.headline || user.bio || 'No public bio has been added yet.'}</p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              {user.showEmailPublic ? <a className="button secondary" href={`mailto:${user.email}`}>Email</a> : null}
              {user.showPhonePublic && user.phoneNumber ? <a className="button secondary" href={`tel:${user.phoneNumber}`}>Call</a> : null}
              {user.websiteUrl ? <a className="button secondary" href={user.websiteUrl} target="_blank">Website</a> : null}
              {followState.isSelf ? <button type="button" className="button primary">Editing enabled below</button> : null}
            </div>
          </div>
          {!followState.isSelf ? (
            <div className="profile-cover-actions">
              <Link href={`/profile/${user.username}/followers`} className="button secondary">Followers · {counts.followers}</Link>
              <Link href={`/profile/${user.username}/following`} className="button secondary">Following · {counts.following}</Link>
              {currentUser ? (
                <FollowButton
                  targetUserId={user.id}
                  isFollowing={followState.isFollowing}
                  followsYou={followState.followsYou}
                  isSelf={followState.isSelf}
                />
              ) : (
                <PiConnectButton className="button primary">Login with Pi to follow</PiConnectButton>
              )}
            </div>
          ) : (
            <div className="profile-cover-actions">
              <Link href={`/profile/${user.username}/followers`} className="button secondary">Followers · {counts.followers}</Link>
              <Link href={`/profile/${user.username}/following`} className="button secondary">Following · {counts.following}</Link>
            </div>
          )}
        </div>
      </section>


      {followState.isSelf ? (
        <ProfileEditPanel
          user={{
            username: user.username,
            fullName: user.fullName || '',
            email: user.email || '',
            bio: user.bio || '',
            country: user.country || '',
            customCountryName: user.customCountryName || '',
            phoneNumber: user.phoneNumber || '',
            headline: user.headline || '',
            profileImage: user.profileImage || '',
            coverImage: user.coverImage || '',
            websiteUrl: user.websiteUrl || '',
            twitterUrl: user.twitterUrl || '',
            instagramUrl: user.instagramUrl || '',
            showPhonePublic: Boolean(user.showPhonePublic),
            showCountryPublic: Boolean(user.showCountryPublic),
          }}
          countries={countries}
        />
      ) : null}

      <section className="stats-grid">
        <Link href={`/profile/${user.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${user.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.following}</strong><span>Following</span></Link>
        <div className="card stat-card"><strong>{user.artworks.length}</strong><span>Public artworks</span></div>
        <div className="card stat-card"><strong>{publicPostCount}</strong><span>Community posts</span></div>
        <div className="card stat-card"><strong>{likedPosts.length}</strong><span>Recent liked posts</span></div>
        <div className="card stat-card"><strong>{commentsAuthoredCount}</strong><span>Replies & comments</span></div>
      </section>

      <PublicProfileCommunityTabs
        posts={ownPosts}
        likedPosts={likedPosts}
        activity={activityItems}
        currentUserId={viewerId}
        canInteract={Boolean(currentUser)}
      />

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
                  <p className="art-description">{artwork.description}</p>
                  <div className="card-actions" style={{ marginTop: 16 }}>
                    <span className="pill">{artwork.status}</span>
                    <Link href={`/artwork/${artwork.id}`} className="button secondary">View artwork</Link>
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
