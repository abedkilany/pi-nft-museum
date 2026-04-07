import type { SessionUser } from '@/lib/auth';
import {
  resolveRequestViewerFromHeaders,
  type HeaderReader,
  type RequestViewerResult,
} from '@/lib/request-viewer';

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

function mapResult(result: RequestViewerResult): AuthenticatedRequestResult {
  return {
    user: result.user,
    source: result.source,
    reason: result.reason === 'missing_session' ? 'missing_bearer_token' : result.reason,
    hasAuthorizationHeader: result.hasAuthorizationHeader,
    hasMalformedAuthorizationHeader: result.hasMalformedAuthorizationHeader,
  };
}

export function readBearerToken(headers: HeaderReader): BearerTokenReadResult {
  const authorizationHeader = headers.get('authorization')?.trim() || '';
  const hasAuthorizationHeader = authorizationHeader.length > 0;

  if (hasAuthorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    const token = authorizationHeader.slice(7).trim() || null;
    return {
      token,
      source: token ? 'authorization' : 'none',
      hasAuthorizationHeader: true,
      hasMalformedAuthorizationHeader: !token,
    };
  }

  return {
    token: null,
    source: 'none',
    hasAuthorizationHeader,
    hasMalformedAuthorizationHeader: hasAuthorizationHeader,
  };
}

export async function resolveAuthenticatedUserFromHeaders(
  headers: HeaderReader,
  options?: { allowAdminBridge?: boolean; allowBearerFallback?: boolean },
): Promise<AuthenticatedRequestResult> {
  const result = await resolveRequestViewerFromHeaders(headers, {
    allowAdminBridge: options?.allowAdminBridge ?? false,
    allowBearerFallback: options?.allowBearerFallback ?? true,
  });

  return mapResult(result);
}
