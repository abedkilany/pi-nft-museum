import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid notification.' }, { status: 400 });

  await prisma.notification.deleteMany({ where: { id, userId: currentUser.userId } });
  return NextResponse.json({ ok: true });
}
