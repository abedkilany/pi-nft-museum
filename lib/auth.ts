import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'pi_nft_auth';

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  role: string;
  piUid?: string | null;
  piUsername?: string | null;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET is not set in .env');
  }

  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());

  return payload as unknown as SessionUser;
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}
