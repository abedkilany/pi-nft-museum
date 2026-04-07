import { headers as nextHeaders } from 'next/headers';
import { resolveAdminBridgeToken } from '@/lib/admin-bridge';
import type { SessionUser } from '@/lib/auth';
import {
  getAdminBridgeCookieFromHeaders,
  getSessionCookieFromHeaders,
} from '@/lib/auth-cookies';
import { extractBearerToken, resolvePiSessionFromToken } from '@/lib/pi-session';

export type HeaderReader = {
  get(name: string): string | null;
};

export type RequestViewerOptions = {
  allowAdminBridge?: boolean;
  allowBearerFallback?: boolean;
};

export type RequestViewerResult = {
  user: SessionUser | null;
  source: 'cookie' | 'bearer' | 'admin-bridge' | 'none';
  authMethod: 'cookie' | 'bearer' | 'admin-bridge' | 'guest';
  reason:
    | 'ok'
    | 'missing_session'
    | 'malformed_bearer_token'
    | 'invalid_or_expired_session'
    | 'invalid_admin_bridge';
  hasAuthorizationHeader: boolean;
  hasMalformedAuthorizationHeader: boolean;
};

function normalizeHeaderValue(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function readSessionCookie(headers: HeaderReader) {
  return getSessionCookieFromHeaders(headers);
}

function readBearerToken(headers: HeaderReader) {
  const authorizationHeader = normalizeHeaderValue(headers.get('authorization'));
  const hasAuthorizationHeader = authorizationHeader.length > 0;

  if (!hasAuthorizationHeader) {
    return {
      token: null,
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }

  const token = extractBearerToken(authorizationHeader);

  return {
    token,
    hasAuthorizationHeader: true,
    hasMalformedAuthorizationHeader: !token,
  };
}

async function resolveSessionUser(token: string) {
  const session = await resolvePiSessionFromToken(token);
  return session?.sessionUser ?? null;
}

export async function resolveRequestViewerFromHeaders(
  headers: HeaderReader,
  options?: RequestViewerOptions,
): Promise<RequestViewerResult> {
  const cookieToken = readSessionCookie(headers);
  if (cookieToken) {
    try {
      const user = await resolveSessionUser(cookieToken);
      if (user) {
        return {
          user,
          source: 'cookie',
          authMethod: 'cookie',
          reason: 'ok',
          hasAuthorizationHeader: false,
          hasMalformedAuthorizationHeader: false,
        };
      }
    } catch {
      return {
        user: null,
        source: 'none',
        authMethod: 'guest',
        reason: 'invalid_or_expired_session',
        hasAuthorizationHeader: false,
        hasMalformedAuthorizationHeader: false,
      };
    }

    return {
      user: null,
      source: 'none',
      authMethod: 'guest',
      reason: 'invalid_or_expired_session',
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }

  const bearer = readBearerToken(headers);
  if (options?.allowBearerFallback !== false && bearer.token) {
    try {
      const user = await resolveSessionUser(bearer.token);
      if (user) {
        return {
          user,
          source: 'bearer',
          authMethod: 'bearer',
          reason: 'ok',
          hasAuthorizationHeader: bearer.hasAuthorizationHeader,
          hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
        };
      }
    } catch {
      return {
        user: null,
        source: 'none',
        authMethod: 'guest',
        reason: 'invalid_or_expired_session',
        hasAuthorizationHeader: bearer.hasAuthorizationHeader,
        hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
      };
    }

    return {
      user: null,
      source: 'none',
      authMethod: 'guest',
      reason: 'invalid_or_expired_session',
      hasAuthorizationHeader: bearer.hasAuthorizationHeader,
      hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
    };
  }

  if (bearer.hasMalformedAuthorizationHeader) {
    return {
      user: null,
      source: 'none',
      authMethod: 'guest',
      reason: 'malformed_bearer_token',
      hasAuthorizationHeader: true,
      hasMalformedAuthorizationHeader: true,
    };
  }

  if (options?.allowAdminBridge) {
    const adminBridgeToken = getAdminBridgeCookieFromHeaders(headers) || '';
    if (adminBridgeToken) {
      try {
        const user = await resolveAdminBridgeToken(adminBridgeToken);
        if (user) {
          return {
            user,
            source: 'admin-bridge',
            authMethod: 'admin-bridge',
            reason: 'ok',
            hasAuthorizationHeader: bearer.hasAuthorizationHeader,
            hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
          };
        }
      } catch {
        return {
          user: null,
          source: 'none',
          authMethod: 'guest',
          reason: 'invalid_admin_bridge',
          hasAuthorizationHeader: bearer.hasAuthorizationHeader,
          hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
        };
      }

      return {
        user: null,
        source: 'none',
        authMethod: 'guest',
        reason: 'invalid_admin_bridge',
        hasAuthorizationHeader: bearer.hasAuthorizationHeader,
        hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
      };
    }
  }

  return {
    user: null,
    source: 'none',
    authMethod: 'guest',
    reason: 'missing_session',
    hasAuthorizationHeader: bearer.hasAuthorizationHeader,
    hasMalformedAuthorizationHeader: bearer.hasMalformedAuthorizationHeader,
  };
}

export async function resolveRequestViewer(options?: RequestViewerOptions): Promise<RequestViewerResult> {
  try {
    const headerStore = await nextHeaders();
    return resolveRequestViewerFromHeaders(headerStore, options);
  } catch {
    return {
      user: null,
      source: 'none',
      authMethod: 'guest',
      reason: 'missing_session',
      hasAuthorizationHeader: false,
      hasMalformedAuthorizationHeader: false,
    };
  }
}
