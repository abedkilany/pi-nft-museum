import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';

const ADMIN_BRIDGE_AUDIENCE = 'pi-nft-museum-admin-page';
const ADMIN_BRIDGE_ISSUER = 'pi-nft-museum';
const ADMIN_BRIDGE_TYPE = 'admin-page-grant';
export const ADMIN_BRIDGE_COOKIE_NAME = 'pi_admin_bridge';
const ADMIN_BRIDGE_TTL_SECONDS = 10 * 60;

export type AdminBridgeClaims = JWTPayload & {
  typ: typeof ADMIN_BRIDGE_TYPE;
  sub: string;
  role: string;
  sv: number;
  rv: number;
  piUid?: string | null;
  piUsername?: string | null;
};

function getSecret() {
  const raw = process.env.APP_SESSION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!raw || raw.length < 32) {
    throw new Error('APP_SESSION_SECRET must be set and at least 32 characters long.');
  }
  return new TextEncoder().encode(raw);
}

export async function issueAdminBridgeToken(input: {
  userId: number;
  role: string;
  piUid?: string | null;
  piUsername?: string | null;
  sessionVersion: number;
  roleVersion: number;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.expiresInSeconds ?? ADMIN_BRIDGE_TTL_SECONDS;

  return new SignJWT({
    typ: ADMIN_BRIDGE_TYPE,
    sub: String(input.userId),
    role: input.role,
    piUid: input.piUid ?? null,
    piUsername: input.piUsername ?? null,
    sv: input.sessionVersion,
    rv: input.roleVersion,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(ADMIN_BRIDGE_ISSUER)
    .setAudience(ADMIN_BRIDGE_AUDIENCE)
    .setIssuedAt(now)
    .setNotBefore(now - 5)
    .setExpirationTime(now + ttl)
    .sign(getSecret());
}

export async function resolveAdminBridgeToken(token: string): Promise<SessionUser | null> {
  const verified = await jwtVerify(token, getSecret(), {
    issuer: ADMIN_BRIDGE_ISSUER,
    audience: ADMIN_BRIDGE_AUDIENCE,
  });

  const payload = verified.payload as AdminBridgeClaims;
  if (payload.typ !== ADMIN_BRIDGE_TYPE) return null;

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
  if (!isAdminRole(user.role.key)) return null;

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role.key,
    piUid: user.piUid,
    piUsername: user.piUsername,
  };
}
