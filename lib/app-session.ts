import { randomUUID } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

const APP_SESSION_AUDIENCE = 'pi-nft-museum-app';
const APP_SESSION_ISSUER = 'pi-nft-museum';
const APP_SESSION_TYPE = 'app-session';
const DEFAULT_TTL_SECONDS = 10 * 60;

export type AppSessionClaims = JWTPayload & {
  typ: typeof APP_SESSION_TYPE;
  sub: string;
  role: string;
  piUid?: string | null;
  piUsername?: string | null;
  sv: number;
  rv: number;
  jti: string;
};

function getSessionSecret() {
  const raw = process.env.APP_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!raw || raw.length < 32) {
    throw new Error('APP_SESSION_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(raw);
}

export async function issueAppSessionToken(input: {
  userId: number;
  role: string;
  piUid?: string | null;
  piUsername?: string | null;
  sessionVersion: number;
  roleVersion: number;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_TTL_SECONDS;
  const payload: AppSessionClaims = {
    typ: APP_SESSION_TYPE,
    sub: String(input.userId),
    role: input.role,
    piUid: input.piUid ?? null,
    piUsername: input.piUsername ?? null,
    sv: input.sessionVersion,
    rv: input.roleVersion,
    jti: randomUUID(),
    iat: now,
    nbf: now - 5,
    exp: now + expiresInSeconds,
    aud: APP_SESSION_AUDIENCE,
    iss: APP_SESSION_ISSUER,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(getSessionSecret());

  return { token, expiresInSeconds, expiresAt: new Date((now + expiresInSeconds) * 1000).toISOString() };
}

export async function verifyAppSessionToken(token: string) {
  const verified = await jwtVerify(token, getSessionSecret(), {
    issuer: APP_SESSION_ISSUER,
    audience: APP_SESSION_AUDIENCE,
  });

  const payload = verified.payload as AppSessionClaims;
  if (payload.typ !== APP_SESSION_TYPE) {
    throw new Error('Invalid session token type.');
  }

  return payload;
}

export async function resolveAppSession(token: string) {
  const payload = await verifyAppSessionToken(token);
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return null;
  if (user.status === 'BANNED' || user.status === 'SUSPENDED') return null;
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
