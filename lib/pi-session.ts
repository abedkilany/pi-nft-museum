import { prisma } from '@/lib/prisma';
import { fetchPiUser } from '@/lib/pi-auth';

function extractBearerToken(authHeader: string | null | undefined) {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export { extractBearerToken };

export async function resolvePiSessionFromToken(token: string) {
  const piUser = await fetchPiUser(token);
  if (!piUser?.uid) return null;

  const user = await prisma.user.findUnique({
    where: { piUid: piUser.uid },
    include: { role: true },
  });

  if (!user) return null;
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') return null;

  return {
    piUser,
    user,
    sessionUser: {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role.key,
      piUid: user.piUid,
      piUsername: user.piUsername,
    },
  };
}
