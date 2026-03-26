export type UserRole =
  | 'visitor'
  | 'artist_or_trader'
  | 'reviewer'
  | 'moderator'
  | 'admin'
  | 'superadmin';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  role: UserRole | string;
  isBanned?: boolean;
  isSuspended?: boolean;
  piUsername?: string | null;
  piUid?: string | null;
}

export interface AuthSession {
  expiresInSeconds: number;
  expiresAt: string;
  refreshExpiresAt: string;
  token?: string;
  refreshToken?: string;
  transport?: 'pi-browser-bearer-fallback' | 'cookie-session';
}

export interface LoginSuccessResponse {
  ok: true;
  message?: string;
  authMode: 'cookie-session-with-refresh-rotation';
  session: AuthSession;
  user?: AuthUser;
}

export interface AuthErrorResponse {
  ok?: false;
  error: string;
  reason?: string;
}

export type AuthResponse = LoginSuccessResponse | AuthErrorResponse;

export interface PiLoginRequestBody {
  accessToken: string;
  requiresFallbackAuth?: boolean;
}

export interface RefreshRequestHeaders {
  'x-auth-mode'?: string;
  'x-refresh-token'?: string;
}

export interface AuthenticatedUserPayload {
  id: number;
  username: string;
  email?: string | null;
  role: string;
  permissions: string[];
  adminPanelAccess: boolean;
  piUid?: string | null;
  piUsername?: string | null;
}

export interface AuthMeSuccessResponse {
  ok: true;
  authenticated: true;
  user: AuthenticatedUserPayload;
  source: 'bearer' | 'cookie' | 'admin-bridge' | 'none';
}

export interface AuthMeErrorResponse {
  ok: false;
  authenticated: false;
  reason: 'MALFORMED_AUTHORIZATION_HEADER' | 'INVALID_OR_EXPIRED_SESSION' | 'NO_SESSION_TOKEN' | 'SERVER_ERROR';
}

export type AuthMeResponse = AuthMeSuccessResponse | AuthMeErrorResponse;
