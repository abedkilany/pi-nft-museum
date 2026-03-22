import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { PostComposer } from '@/components/community/PostComposer';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { ActiveCreatorCard } from '@/components/community/ActiveCreatorCard';
import { scoreCommunityPost, scoreCreator } from '@/lib/community';

export const dynamic = 'force-dynamic';


function serializeArtwork(artwork: {
  id: number;
  title: string;
  imageUrl: string;
  status: unknown;
  price: { toString(): string } | number | string | null;
  currency: string;
} | null) {
  if (!artwork) return null;
  return {
    id: artwork.id,
    title: artwork.title,
    imageUrl: artwork.imageUrl,
    status: String(artwork.status),
    price: artwork.price == null ? 0 : artwork.price.toString(),
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

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: { feed?: string };
}) {
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

  const likeUserId = -1;
  const feedMode = searchParams?.feed === 'latest' ? 'latest' : 'top';

  const [posts, creators, myArtworks] = await Promise.all([
    prisma.communityPost.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
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
      take: 20,
      select: {
        id: true,
        username: true,
        fullName: true,
        headline: true,
        profileImage: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            artworks: true,
            followers: true,
          },
        },
        posts: {
          where: { isPublished: true },
          select: {
            createdAt: true,
            likesCount: true,
            commentsCount: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    }),
    Promise.resolve([]),
  ]);

  const serializedPosts = posts.map((post) => ({
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
    feedScore: scoreCommunityPost({
      createdAt: post.createdAt,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      linkedArtwork: Boolean(post.artworkId),
    }),
    comments: serializeComments(post.comments),
  }));

  serializedPosts.sort((a, b) => {
    if (feedMode === 'latest') {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  const rankedCreators = creators
    .map((creator) => {
      const totalPostLikes = creator.posts.reduce((sum, post) => sum + post.likesCount, 0);
      const totalPostComments = creator.posts.reduce((sum, post) => sum + post.commentsCount, 0);
      const lastPostAt = creator.posts[0]?.createdAt ?? null;
      const creatorScore = scoreCreator({
        posts: creator._count.posts,
        artworks: creator._count.artworks,
        followers: creator._count.followers,
        totalPostLikes,
        totalPostComments,
        lastPostAt,
      });
      return {
        ...creator,
        creatorScore,
      };
    })
    .sort((a, b) => {
      if (b.creatorScore !== a.creatorScore) return b.creatorScore - a.creatorScore;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .slice(0, 6);

  const creatorIds = rankedCreators.map((creator) => creator.id);
  let followingSet = new Set<number>();
  let reverseSet = new Set<number>();


  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '28px' }}>
        <span className="section-kicker">Community 2.0</span>
        <h1 style={{ margin: '0 0 12px' }}>Creator feed</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          The community now prioritizes stronger posts, surfaces active creators more intelligently, and lets artists attach an artwork directly to a post.
        </p>
        <div className="card-actions">
          <span className="pill">Smart feed</span>
          <span className="pill">Artwork sharing</span>
          <span className="pill">Creator ranking</span>
          <span className="pill">Replies live</span>
        </div>
      </section>

      <PostComposer
        disabled={true}
        username={null}
        artworks={myArtworks.map((artwork) => ({
          id: artwork.id,
          title: artwork.title,
          status: artwork.status,
        }))}
      />

      <section style={{ display: 'grid', gap: 16 }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Creators</span>
            <h2>Active creators</h2>
          </div>
          <p>A compact shortlist of the strongest creators right now, so visitors reach the feed quickly.</p>
        </div>

        {rankedCreators.length > 0 ? (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {rankedCreators.map((creator) => (
              <ActiveCreatorCard
                key={creator.id}
                creator={{
                  id: creator.id,
                  username: creator.username,
                  fullName: creator.fullName,
                  headline: creator.headline,
                  profileImage: creator.profileImage,
                  score: creator.creatorScore,
                  stats: {
                    posts: creator._count.posts,
                    artworks: creator._count.artworks,
                    followers: creator._count.followers,
                  },
                }}
                isFollowing={followingSet.has(creator.id)}
                followsYou={reverseSet.has(creator.id)}
                isSelf={false}
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
            <h2>{feedMode === 'latest' ? 'Latest posts' : 'Top posts right now'}</h2>
          </div>
          <div className="card-actions" style={{ marginTop: 0 }}>
            <Link href="/community?feed=top" className={feedMode === 'top' ? 'button primary' : 'button secondary'}>Top</Link>
            <Link href="/community?feed=latest" className={feedMode === 'latest' ? 'button primary' : 'button secondary'}>Latest</Link>
          </div>
        </div>
        <CommunityFeed posts={serializedPosts} currentUserId={null} canInteract={false} />
      </section>
    </div>
  );
}
