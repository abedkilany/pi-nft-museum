import { resolveAppSession } from '@/lib/app-session';

function extractBearerToken(authHeader: string | null | undefined) {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export { extractBearerToken };

export async function resolvePiSessionFromToken(token: string) {
  return resolveAppSession(token);
}
