import type { SessionUser } from '@/lib/auth';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

type HeaderReader = {
  get(name: string): string | null;
};

export type BearerTokenReadResult = {
  token: string | null;
  source: 'authorization' | 'none';
  hasAuthorizationHeader: boolean;
  hasMalformedAuthorizationHeader: boolean;
};

export type AuthenticatedRequestResult = {
  user: SessionUser | null;
  source: 'bearer' | 'admin-bridge' | 'none';
  reason:
    | 'ok'
    | 'missing_bearer_token'
    | 'malformed_bearer_token'
    | 'invalid_or_expired_session'
    | 'invalid_admin_bridge';
  hasAuthorizationHeader: boolean;
  hasMalformedAuthorizationHeader: boolean;
};

function normalizeHeaderValue(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readBearerToken(headers: HeaderReader): BearerTokenReadResult {
  const authorizationHeader = normalizeHeaderValue(headers.get('authorization'));
  const hasAuthorizationHeader = authorizationHeader.length > 0;

  if (!hasAuthorizationHeader) {
    return {
      token: null,
      source: 'none',
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }

  const token = extractBearerToken(authorizationHeader);
  return {
    token,
    source: token ? 'authorization' : 'none',
    hasAuthorizationHeader: true,
    hasMalformedAuthorizationHeader: !token,
  };
}

export async function resolveAuthenticatedUserFromHeaders(
  headers: HeaderReader,
  options?: { allowAdminBridge?: boolean }
): Promise<AuthenticatedRequestResult> {
  const bearer = readBearerToken(headers);

  if (bearer.token) {
    try {
      const session = await resolvePiSessionFromToken(bearer.token);
      if (session?.sessionUser) {
        return {
          user: session.sessionUser,
          source: 'bearer',
          reason: 'ok',
          hasAuthorizationHeader: bearer.hasAuthorizationHeader,
          hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
        };
      }
    } catch {
      return {
        user: null,
        source: 'none',
        reason: 'invalid_or_expired_session',
        hasAuthorizationHeader: bearer.hasAuthorizationHeader,
        hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
      };
    }

    return {
      user: null,
      source: 'none',
      reason: 'invalid_or_expired_session',
      hasAuthorizationHeader: bearer.hasAuthorizationHeader,
      hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
    };
  }

  if (bearer.hasMalformedAuthorizationHeader) {
    return {
      user: null,
      source: 'none',
      reason: 'malformed_bearer_token',
      hasAuthorizationHeader: true,
      hasMalformedAuthorizationHeader: true,
    };
  }

  return {
    user: null,
    source: 'none',
    reason: 'missing_bearer_token',
    hasAuthorizationHeader: bearer.hasAuthorizationHeader,
    hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
  };
}
