import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const csrfError = assertSameOrigin(request);
  if (csrfError) return csrfError;
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });

  await prisma.notification.updateMany({
    where: { id, userId: currentUser.userId },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}