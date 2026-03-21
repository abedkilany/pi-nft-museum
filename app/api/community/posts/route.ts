import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

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

export async function GET() {
  const currentUser = await getCurrentUser();

  const likeUserId = currentUser?.userId ?? -1;
  const posts = await prisma.communityPost.findMany({
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
  });

  return NextResponse.json({
    ok: true,
    posts: posts.map((post) => ({
      id: post.id,
      body: post.body,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      authorId: post.authorId,
      author: post.author,
      comments: serializeComments(post.comments),
      viewerLiked: currentUser ? post.likes.length > 0 : false,
    })),
  });
}
