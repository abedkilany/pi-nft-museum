import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { getCurrentUser } from '@/lib/current-user';
import { PostComposer } from '@/components/community/PostComposer';
import { CommunityFeed } from '@/components/community/CommunityFeed';

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
  const postInclude = {
    author: {
      select: {
        username: true,
        fullName: true,
        profileImage: true,
        headline: true,
      },
    },
    comments: {
      orderBy: { createdAt: 'asc' as const },
      take: 10,
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
  };

  const posts = await prisma.communityPost.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: postInclude,
  });

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
    comments: post.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      authorId: comment.authorId,
      author: comment.author,
    })),
  }));

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
        </div>
      </section>

      <PostComposer disabled={!currentUser} username={currentUser?.username || null} />

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Feed</span>
            <h2>Latest posts</h2>
          </div>
          <p>{currentUser ? 'Your community tools are ready.' : 'Log in to publish, like, and comment.'}</p>
        </div>
        <CommunityFeed posts={serializedPosts} currentUserId={currentUser?.userId || null} canInteract={Boolean(currentUser)} />
      </section>
    </div>
  );
}
