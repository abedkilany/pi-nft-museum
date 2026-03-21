import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/current-user';
import { assertSameOrigin } from '@/lib/security';

export async function DELETE(request: Request) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const postId = Number(payload.postId);

  if (!postId) {
    return NextResponse.json({ error: 'Invalid post.' }, { status: 400 });
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
  }

  if (post.authorId !== currentUser.userId) {
    return NextResponse.json({ error: 'You can only delete your own posts.' }, { status: 403 });
  }

  await prisma.communityPost.delete({ where: { id: postId } });

  return NextResponse.json({ ok: true, message: 'Post deleted.' });
}
