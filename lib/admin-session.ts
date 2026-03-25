import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';

export const ADMIN_SESSION_COOKIE_NAME = 'pi_admin_session';
const ADMIN_SESSION_AUDIENCE = 'pi-nft-museum-admin';
const ADMIN_SESSION_ISSUER = 'pi-nft-museum';
const ADMIN_SESSION_TYPE = 'admin-session';
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AdminSessionClaims = JWTPayload & {
  typ: typeof ADMIN_SESSION_TYPE;
  sub: string;
  role: string;
  sv: number;
  rv: number;
  jti: string;
};

function getSessionSecret() {
  const raw = process.env.ADMIN_SESSION_SECRET || process.env.APP_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!raw || raw.length < 32) {
    throw new Error('ADMIN_SESSION_SECRET or APP_SESSION_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(raw);
}

function parseCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const chunks = cookieHeader.split(';');
  for (const chunk of chunks) {
    const [rawName, ...rest] = chunk.trim().split('=');
    if (rawName !== name) continue;
    return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function getAdminSessionCookieOptions(maxAge = DEFAULT_TTL_SECONDS) {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function issueAdminSessionToken(input: {
  userId: number;
  role: string;
  sessionVersion: number;
  roleVersion: number;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_TTL_SECONDS;
  const payload: AdminSessionClaims = {
    typ: ADMIN_SESSION_TYPE,
    sub: String(input.userId),
    role: input.role,
    sv: input.sessionVersion,
    rv: input.roleVersion,
    jti: randomUUID(),
    iat: now,
    nbf: now - 5,
    exp: now + expiresInSeconds,
    aud: ADMIN_SESSION_AUDIENCE,
    iss: ADMIN_SESSION_ISSUER,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(getSessionSecret());

  return { token, expiresInSeconds, expiresAt: new Date((now + expiresInSeconds) * 1000).toISOString() };
}

export async function verifyAdminSessionToken(token: string) {
  const verified = await jwtVerify(token, getSessionSecret(), {
    issuer: ADMIN_SESSION_ISSUER,
    audience: ADMIN_SESSION_AUDIENCE,
  });

  const payload = verified.payload as AdminSessionClaims;
  if (payload.typ !== ADMIN_SESSION_TYPE) {
    throw new Error('Invalid admin session token type.');
  }

  return payload;
}

export async function resolveAdminSessionToken(token: string) {
  const payload = await verifyAdminSessionToken(token);
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return null;
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') return null;
  if (!isAdminRole(user.role.key)) return null;
  if (user.sessionVersion !== payload.sv) return null;
  if (user.roleVersion !== payload.rv) return null;
  if (user.role.key !== payload.role) return null;

  const sessionUser: SessionUser = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role.key,
    piUid: user.piUid,
    piUsername: user.piUsername,
  };

  return {
    payload,
    user,
    sessionUser,
  };
}

export async function resolveAdminSessionFromCookieHeader(cookieHeader: string | null | undefined) {
  const token = parseCookieValue(cookieHeader, ADMIN_SESSION_COOKIE_NAME);
  if (!token) return null;
  return resolveAdminSessionToken(token);
}
