import { cookies } from 'next/headers';
import { getAuthCookieName, verifySessionToken } from './auth';

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAuthCookieName())?.value;

    if (!token) return null;

    const user = await verifySessionToken(token);
    return user;
  } catch {
    return null;
  }
}