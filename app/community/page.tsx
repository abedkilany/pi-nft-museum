import Link from 'next/link';
import { prisma } from '@/lib/domains/system';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { scoreCreator } from '@/lib/domains/community';
import { CommunityClientShell } from '@/components/community/CommunityClientShell';

export const dynamic = 'force-dynamic';

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

  const feedMode = searchParams?.feed === 'latest' ? 'latest' : 'top';

  const creators = await prisma.user.findMany({
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
        id: creator.id,
        username: creator.username,
        fullName: creator.fullName,
        headline: creator.headline,
        profileImage: creator.profileImage,
        score: creatorScore,
        updatedAt: creator.updatedAt,
        stats: {
          posts: creator._count.posts,
          artworks: creator._count.artworks,
          followers: creator._count.followers,
        },
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .slice(0, 6)
    .map(({ updatedAt, ...creator }) => creator);

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
      </section>

      <CommunityClientShell feedMode={feedMode} creators={rankedCreators} />
    </div>
  );
}
