import { resolveAdminBridgeToken } from '@/lib/admin-bridge';
import type { SessionUser } from '@/lib/auth';
import { getAdminBridgeCookieFromHeaders, getSessionCookieFromHeaders } from '@/lib/auth-cookies';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

type HeaderReader = {
  get(name: string): string | null;
};

export type BearerTokenReadResult = {
  token: string | null;
  source: 'authorization' | 'cookie' | 'none';
  hasAuthorizationHeader: boolean;
  hasMalformedAuthorizationHeader: boolean;
};

export type AuthenticatedRequestResult = {
  user: SessionUser | null;
  source: 'bearer' | 'cookie' | 'admin-bridge' | 'none';
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

  if (hasAuthorizationHeader) {
    const token = extractBearerToken(authorizationHeader);
    return {
      token,
      source: token ? 'authorization' : 'none',
      hasAuthorizationHeader: true,
      hasMalformedAuthorizationHeader: !token,
    };
  }

  const cookieToken = getSessionCookieFromHeaders(headers);
  if (cookieToken) {
    return {
      token: cookieToken,
      source: 'cookie',
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }

  return {
    token: null,
    source: 'none',
    hasAuthorizationHeader: false,
    hasMalformedAuthorizationHeader: false,
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
          source: bearer.source === 'cookie' ? 'cookie' : 'bearer',
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

  if (options?.allowAdminBridge) {
    const adminBridgeToken = normalizeHeaderValue(headers.get('x-admin-grant')) || getAdminBridgeCookieFromHeaders(headers) || '';
    if (adminBridgeToken) {
      try {
        const user = await resolveAdminBridgeToken(adminBridgeToken);
        if (user) {
          return {
            user,
            source: 'admin-bridge',
            reason: 'ok',
            hasAuthorizationHeader: bearer.hasAuthorizationHeader,
            hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
          };
        }
      } catch {
        return {
          user: null,
          source: 'none',
          reason: 'invalid_admin_bridge',
          hasAuthorizationHeader: bearer.hasAuthorizationHeader,
          hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
        };
      }

      return {
        user: null,
        source: 'none',
        reason: 'invalid_admin_bridge',
        hasAuthorizationHeader: bearer.hasAuthorizationHeader,
        hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
      };
    }
  }

  return {
    user: null,
    source: 'none',
    reason: 'missing_bearer_token',
    hasAuthorizationHeader: bearer.hasAuthorizationHeader,
    hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
  };
}
