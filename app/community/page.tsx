import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { getCurrentUser } from '@/lib/current-user';
import { PostComposer } from '@/components/community/PostComposer';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { ActiveCreatorCard } from '@/components/community/ActiveCreatorCard';

function serializeComments(comments: Array<any>) {
  const byId = new Map<number, any>();
  const roots: any[] = [];

  for (const comment of comments) {
    byId.set(comment.id, {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
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

export default async function CommunityPage() {
  const settings = await getSiteSettingsMap();
  const enabled = getBooleanSetting(settings, 'community_enabled', false);

  if (!enabled) {
    return (
      <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
        <section className="card" style={{ padding: '28px' }}>
          <span className="section-kicker">Community</span>
          <h1 style={{ margin: '0 0 12px' }}>Coming soon</h1>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
            The community area is currently disabled from site settings. The social layer will appear here once it is enabled.
          </p>
          <div className="card-actions">
            <Link href="/gallery" className="button secondary">Back to gallery</Link>
          </div>
        </section>
      </div>
    );
  }

  const currentUser = await getCurrentUser();
  const likeUserId = currentUser?.userId ?? -1;

  const [posts, creators] = await Promise.all([
    prisma.communityPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: {
          select: {
            username: true,
            fullName: true,
            profileImage: true,
            headline: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
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
        likes: {
          where: { userId: likeUserId },
          select: { id: true },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { posts: { some: { isPublished: true } } },
          { artworks: { some: {} } },
        ],
      },
      take: 6,
      orderBy: [
        { posts: { _count: 'desc' } },
        { followers: { _count: 'desc' } },
        { artworks: { _count: 'desc' } },
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        username: true,
        fullName: true,
        headline: true,
        profileImage: true,
        _count: {
          select: {
            posts: true,
            artworks: true,
            followers: true,
          },
        },
      },
    }),
  ]);

  const serializedPosts = posts.map((post) => ({
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    viewerLiked: currentUser ? post.likes.length > 0 : false,
    authorId: post.authorId,
    author: post.author,
    comments: serializeComments(post.comments),
  }));

  const creatorIds = creators.map((creator) => creator.id);
  let followingSet = new Set<number>();
  let reverseSet = new Set<number>();

  if (currentUser && creatorIds.length > 0) {
    const [mine, reverse] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: currentUser.userId, followingId: { in: creatorIds } },
        select: { followingId: true },
      }),
      prisma.follow.findMany({
        where: { followerId: { in: creatorIds }, followingId: currentUser.userId },
        select: { followerId: true },
      }),
    ]);

    followingSet = new Set(mine.map((item) => item.followingId));
    reverseSet = new Set(reverse.map((item) => item.followerId));
  }

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '28px' }}>
        <span className="section-kicker">Community</span>
        <h1 style={{ margin: '0 0 12px' }}>Creator feed</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          Publish short updates, react to posts, and start simple discussions around artworks and artists.
        </p>
        <div className="card-actions">
          <span className="pill">Posts live</span>
          <span className="pill">Likes live</span>
          <span className="pill">Comments live</span>
          <span className="pill">Replies live</span>
        </div>
      </section>

      <PostComposer disabled={!currentUser} username={currentUser?.username || null} />

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Creators</span>
            <h2>Active creators</h2>
          </div>
          <p>Profiles with published posts, artworks, or both now appear here instead of an empty panel.</p>
        </div>

        {creators.length > 0 ? (
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {creators.map((creator) => (
              <ActiveCreatorCard
                key={creator.id}
                creator={{
                  id: creator.id,
                  username: creator.username,
                  fullName: creator.fullName,
                  headline: creator.headline,
                  profileImage: creator.profileImage,
                  stats: {
                    posts: creator._count.posts,
                    artworks: creator._count.artworks,
                    followers: creator._count.followers,
                  },
                }}
                isFollowing={followingSet.has(creator.id)}
                followsYou={reverseSet.has(creator.id)}
                isSelf={currentUser?.userId === creator.id}
              />
            ))}
          </div>
        ) : (
          <section className="card" style={{ padding: 24 }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>No active creators are available yet. As soon as creators publish posts or artworks, they will appear here.</p>
          </section>
        )}
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Feed</span>
            <h2>Latest posts</h2>
          </div>
          <p>{currentUser ? 'Your community tools are ready.' : 'Log in to publish, like, comment, and reply.'}</p>
        </div>
        <CommunityFeed posts={serializedPosts} currentUserId={currentUser?.userId || null} canInteract={Boolean(currentUser)} />
      </section>
    </div>
  );
}
