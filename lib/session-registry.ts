import { createHash, randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

type HeaderReader = { get(name: string): string | null };

const REFRESH_TOKEN_AUDIENCE = 'pi-nft-museum-refresh';
const SESSION_DEVICE_FALLBACK = 'unknown-device';

function getHeader(headers: HeaderReader, name: string) {
  return headers.get(name) || headers.get(name.toLowerCase()) || headers.get(name.toUpperCase());
}

function buildSessionTrackingFields(headers: HeaderReader) {
  return {
    lastRoute: getHeader(headers, 'x-route-path') || getHeader(headers, 'referer') || null,
    lastRequestId: getHeader(headers, 'x-request-id') || getHeader(headers, 'x-vercel-id') || null,
    lastTraceId: getHeader(headers, 'x-trace-id') || null,
    lastCorrelationId: getHeader(headers, 'x-correlation-id') || getHeader(headers, 'x-trace-id') || null,
    lastActivityType: getHeader(headers, 'x-session-activity') || 'auth',
  };
}

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

export function hashRefreshToken(token: string) {
  return sha256(token);
}

export function hashIpAddress(ipAddress: string | null | undefined) {
  return ipAddress ? sha256(ipAddress) : null;
}

export function buildDeviceInfo(headers: HeaderReader) {
  return headers.get('user-agent') || SESSION_DEVICE_FALLBACK;
}

export function buildRefreshTokenValue() {
  return `${REFRESH_TOKEN_AUDIENCE}.${randomUUID()}.${randomUUID()}`;
}

export async function createSessionRegistryEntry(input: {
  userId: number;
  jti: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  headers: HeaderReader;
}) {
  return prisma.userSession.create({
    data: {
      userId: input.userId,
      jti: input.jti,
      refreshTokenHash: hashRefreshToken(input.refreshToken),
      deviceInfo: buildDeviceInfo(input.headers),
      ipHash: hashIpAddress(input.headers.get('x-forwarded-for') || input.headers.get('x-real-ip')),
      userAgent: input.headers.get('user-agent'),
      ...buildSessionTrackingFields(input.headers),
      expiresAt: input.expiresAt,
      refreshExpiresAt: input.refreshExpiresAt,
      lastSeenAt: new Date(),
    },
  });
}

export async function touchSessionRegistryEntry(jti: string, headers?: HeaderReader) {
  return prisma.userSession.updateMany({
    where: { jti, revokedAt: null },
    data: {
      lastSeenAt: new Date(),
      ...(headers ? buildSessionTrackingFields(headers) : {}),
    },
  }).catch(() => null);
}

export async function revokeSessionByJti(jti: string) {
  return prisma.userSession.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date() },
  }).catch(() => null);
}

export async function revokeSessionByRefreshToken(refreshToken: string) {
  return prisma.userSession.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  }).catch(() => null);
}

export async function rotateRefreshSession(input: {
  oldRefreshToken: string;
  newRefreshToken: string;
  newJti: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  headers: HeaderReader;
}) {
  const session = await prisma.userSession.findFirst({
    where: {
      refreshTokenHash: hashRefreshToken(input.oldRefreshToken),
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() },
    },
  });

  if (!session) return null;

  return prisma.userSession.update({
    where: { id: session.id },
    data: {
      jti: input.newJti,
      refreshTokenHash: hashRefreshToken(input.newRefreshToken),
      deviceInfo: buildDeviceInfo(input.headers),
      ipHash: hashIpAddress(input.headers.get('x-forwarded-for') || input.headers.get('x-real-ip')),
      userAgent: input.headers.get('user-agent'),
      ...buildSessionTrackingFields(input.headers),
      expiresAt: input.expiresAt,
      refreshExpiresAt: input.refreshExpiresAt,
      lastSeenAt: new Date(),
    },
  });
}

export async function getActiveSessionByRefreshToken(refreshToken: string) {
  return prisma.userSession.findFirst({
    where: {
      refreshTokenHash: hashRefreshToken(refreshToken),
      revokedAt: null,
      refreshExpiresAt: { gt: new Date() },
    },
  });
}
