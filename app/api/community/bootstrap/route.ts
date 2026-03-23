import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteSettingsMap, getBooleanSetting } from '@/lib/site-settings';
import { scoreCommunityPost, scoreCreator } from '@/lib/community';
import { getCurrentUserFromHeaders } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(request: NextRequest) {
  const settings = await getSiteSettingsMap();
  const enabled = getBooleanSetting(settings, 'community_enabled', false);

  if (!enabled) {
    return NextResponse.json({ ok: true, enabled: false });
  }

  const currentUser = await getCurrentUserFromHeaders(request.headers);
  const likeUserId = currentUser?.userId ?? -1;
  const feedMode = request.nextUrl.searchParams.get('feed') === 'latest' ? 'latest' : 'top';

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
    currentUser ? prisma.artwork.findMany({
      where: { artistUserId: currentUser.userId },
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 12,
      select: {
        id: true,
        title: true,
        status: true,
      },
    }) : Promise.resolve([]),
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
        updatedAt: creator.updatedAt.toISOString(),
        creatorScore,
      };
    })
    .sort((a, b) => {
      if (b.creatorScore !== a.creatorScore) return b.creatorScore - a.creatorScore;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })
    .slice(0, 6);

  const creatorIds = rankedCreators.map((creator) => creator.id);
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

  return NextResponse.json({
    ok: true,
    enabled: true,
    feedMode,
    currentUser,
    myArtworks,
    posts: serializedPosts,
    creators: rankedCreators.map((creator) => ({
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
      isFollowing: followingSet.has(creator.id),
      followsYou: reverseSet.has(creator.id),
    })),
  });
}
