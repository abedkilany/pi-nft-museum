import { cookies } from 'next/headers';
import { verifySessionToken, type SessionUser } from './auth';
import { readAuthTokenFromCookieStore } from './auth-cookie';
import { prisma } from './prisma';

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = readAuthTokenFromCookieStore(cookieStore);

    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session?.userId) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      include: { role: true },
    });

    if (!dbUser) return null;
    if (dbUser.status === 'BANNED' || dbUser.status === 'SUSPENDED') return null;

    return {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role.key,
      piUid: dbUser.piUid,
      piUsername: dbUser.piUsername,
      sessionId: session.sessionId,
    };
  } catch {
    return null;
  }
}
