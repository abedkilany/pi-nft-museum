import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';

export async function GET() {
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

  return NextResponse.json({
    ok: true,
    posts: posts.map((post) => ({
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      comments: post.comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
      viewerLiked: currentUser ? post.likes.length > 0 : false,
      likes: undefined,
    })),
  });
}
