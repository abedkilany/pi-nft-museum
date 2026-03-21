import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { scoreCommunityPost } from '@/lib/community';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeComments(comments: Array<any>) {
  const byId = new Map<number, any>();
  const roots: any[] = [];

  for (const comment of comments) {
    byId.set(comment.id, {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
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

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'latest' ? 'latest' : 'top';
  const likeUserId = currentUser?.userId ?? -1;

  const posts = await prisma.communityPost.findMany({
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
  });

  const mapped = posts.map((post) => ({
    id: post.id,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    authorId: post.authorId,
    author: post.author,
    artwork: post.artwork,
    comments: serializeComments(post.comments),
    viewerLiked: currentUser ? post.likes.length > 0 : false,
    feedScore: scoreCommunityPost({
      createdAt: post.createdAt,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      linkedArtwork: Boolean(post.artworkId),
    }),
  }));

  const sorted = [...mapped].sort((a, b) => {
    if (mode === 'latest') {
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    if (b.feedScore !== a.feedScore) return b.feedScore - a.feedScore;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });

  return NextResponse.json({
    ok: true,
    mode,
    posts: sorted,
  });
}
