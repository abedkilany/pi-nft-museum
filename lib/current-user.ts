import { cookies } from 'next/headers';
import { verifySessionToken } from './auth';
import { readAuthTokenFromCookieStore } from './auth-cookie';

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = readAuthTokenFromCookieStore(cookieStore);

    if (!token) return null;

    const user = await verifySessionToken(token);
    return user;
  } catch {
    return null;
  }
}
