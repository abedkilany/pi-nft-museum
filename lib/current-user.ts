import { cookies, headers } from 'next/headers';
import type { SessionUser } from './auth';
import { extractBearerToken, resolvePiSessionFromToken } from './pi-session';

const APP_SESSION_COOKIE_NAME = 'pi_app_session';

async function resolveFromAppSession(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const session = await resolvePiSessionFromToken(token);
    return session?.sessionUser || null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headerStore = headers();
    const cookieStore = cookies();
    const token =
      extractBearerToken(headerStore.get('authorization')) ||
      headerStore.get('x-auth-token') ||
      cookieStore.get(APP_SESSION_COOKIE_NAME)?.value ||
      null;

    return resolveFromAppSession(token);
  } catch {
    return null;
  }
}
