import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { PremiumBadge } from '@/components/shared/PremiumBadge';
import { getFollowCounts } from '@/lib/follows';
import { scoreCommunityPost } from '@/lib/community';
import PublicProfileTabsClient from '@/components/profile/PublicProfileTabsClient';
import PublicProfileViewerControls from '@/components/profile/PublicProfileViewerControls';
import type { CommunityFeedPost } from '@/components/community/PostCard';
import { getDisplayImageUrl } from '@/lib/image-url';

export const dynamic = 'force-dynamic';

const PUBLIC_ARTWORK_PREVIEW_LIMIT = 12;
const PUBLIC_POST_PREVIEW_LIMIT = 12;
const ACTIVITY_PREVIEW_LIMIT = 8;

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

function serializePost(post: any): CommunityFeedPost {
  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    viewerLiked: false,
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

function normalizeExternalUrl(url: string | null | undefined) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
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
    likes: false as const,
  };

  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: {
      role: true,
      artworks: {
        where: { status: { in: ['PUBLISHED', 'PREMIUM'] } },
        orderBy: { publishedAt: 'desc' },
        take: PUBLIC_ARTWORK_PREVIEW_LIMIT,
        include: { category: true },
      },
    },
  });

  if (!user) notFound();

  const displayName = user.fullName || user.username;
  const publicCountry = user.country === '__OTHER__' ? user.customCountryName : user.country;
  const websiteUrl = normalizeExternalUrl(user.websiteUrl);
  const twitterUrl = normalizeExternalUrl(user.twitterUrl);
  const instagramUrl = normalizeExternalUrl(user.instagramUrl);

  const [counts, publicArtworkCount, publicPostCount, likedPostsCount, ownPostsRaw, likedPostLikesRaw, activitiesRaw, commentsAuthoredCount] = await Promise.all([
    getFollowCounts(user.id),
    prisma.artwork.count({ where: { artistUserId: user.id, status: { in: ['PUBLISHED', 'PREMIUM'] } } }),
    prisma.communityPost.count({ where: { authorId: user.id, isPublished: true } }),
    prisma.communityPostLike.count({ where: { userId: user.id, post: { isPublished: true } } }),
    prisma.communityPost.findMany({
      where: { authorId: user.id, isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: PUBLIC_POST_PREVIEW_LIMIT,
      include: commonPostInclude,
    }),
    prisma.communityPostLike.findMany({
      where: {
        userId: user.id,
        post: { isPublished: true },
      },
      orderBy: { createdAt: 'desc' },
      take: PUBLIC_POST_PREVIEW_LIMIT,
      include: {
        post: {
          include: commonPostInclude,
        },
      },
    }),
    prisma.communityActivity.findMany({
      where: { OR: [{ actorId: user.id }, { subjectUserId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_PREVIEW_LIMIT,
    }),
    prisma.communityPostComment.count({ where: { authorId: user.id } }),
  ]);

  const recentRepliesAndComments = await prisma.communityPostComment.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_PREVIEW_LIMIT,
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

  const ownPosts = ownPostsRaw.map((post) => serializePost(post));
  const likedPosts = likedPostLikesRaw
    .map((entry) => entry.post)
    .filter((post, index, array) => array.findIndex((candidate) => candidate.id === post.id) === index)
    .map((post) => serializePost(post));

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
      message: `${comment.body}\n\nOn ${comment.post.author.fullName || comment.post.author.username}'s post.`,
      createdAt: comment.createdAt.toISOString(),
      linkUrl: '/community',
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 12);

  return (
    <div className="page-stack">
      <section className="card" style={{ overflow: 'hidden' }}>
        <div
          className="profile-cover"
          style={{
            backgroundImage: user.coverImage
              ? `linear-gradient(135deg, rgba(10,12,18,0.25), rgba(10,12,18,0.78)), url(${getDisplayImageUrl(user.coverImage)})`
              : undefined,
          }}
        >
          <div className="profile-avatar profile-avatar-large">
            {user.profileImage ? (
              <img src={getDisplayImageUrl(user.profileImage)} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <span className="section-kicker">Public creator profile</span>
            <h1 style={{ margin: '6px 0 8px' }}>{displayName}</h1>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>
              @{user.username} · {user.role.name}
              {publicCountry && user.showCountryPublic ? ` · ${publicCountry}` : ''}
            </p>
            <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>{user.headline || user.bio || 'No public bio has been added yet.'}</p>
            <div className="card-actions" style={{ marginTop: 16 }}>
              {user.showEmailPublic ? <a className="button secondary" href={`mailto:${user.email}`}>Email</a> : null}
              {user.showPhonePublic && user.phoneNumber ? <a className="button secondary" href={`tel:${user.phoneNumber}`}>Call</a> : null}
              {websiteUrl ? <a className="button secondary" href={websiteUrl} target="_blank" rel="noopener noreferrer">Website</a> : null}
              {twitterUrl ? <a className="button secondary" href={twitterUrl} target="_blank" rel="noopener noreferrer">X / Twitter</a> : null}
              {instagramUrl ? <a className="button secondary" href={instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a> : null}
            </div>
          </div>
        </div>

        <PublicProfileViewerControls
          username={user.username}
          targetUserId={user.id}
          counts={counts}
        />
      </section>

      <section className="stats-grid">
        <Link href={`/profile/${user.username}/followers`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.followers}</strong><span>Followers</span></Link>
        <Link href={`/profile/${user.username}/following`} className="card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}><strong>{counts.following}</strong><span>Following</span></Link>
        <div className="card stat-card"><strong>{publicArtworkCount}</strong><span>Public artworks</span></div>
        <div className="card stat-card"><strong>{publicPostCount}</strong><span>Community posts</span></div>
        <div className="card stat-card"><strong>{likedPostsCount}</strong><span>Total liked posts</span></div>
        <div className="card stat-card"><strong>{commentsAuthoredCount}</strong><span>Replies & comments</span></div>
      </section>

      <PublicProfileTabsClient posts={ownPosts} likedPosts={likedPosts} activity={activityItems} />

      <section className="card surface-section">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Published works</span>
            <h2>Gallery</h2>
          </div>
          <p>
            Showing the latest {Math.min(user.artworks.length, PUBLIC_ARTWORK_PREVIEW_LIMIT)} of {publicArtworkCount} public artwork{publicArtworkCount === 1 ? '' : 's'}.
          </p>
        </div>
        {user.artworks.length === 0 ? (
          <p style={{ margin: 0 }}>No public artworks yet.</p>
        ) : (
          <div className="gallery-grid">
            {user.artworks.map((artwork: any) => (
              <article key={artwork.id} className="card art-card">
                <div className="art-image-wrap"><img src={getDisplayImageUrl(artwork.imageUrl)} alt={artwork.title} className="art-image" /></div>
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
