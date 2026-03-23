import { buildObservabilityHeaders } from '@/lib/observability-client';

const APP_SESSION_TOKEN_KEY = 'pi_app_session_token';
const JWT_SEGMENT_COUNT = 3;
const CLIENT_EXPIRY_SKEW_SECONDS = 30;

type JwtPayload = {
  exp?: number;
  nbf?: number;
};

let memoryToken: string | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getSessionStorageSafe() {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function clearStoredToken() {
  memoryToken = null;
  const storage = getSessionStorageSafe();
  storage?.removeItem(APP_SESSION_TOKEN_KEY);
}

function isJwtLike(token: string) {
  return token.split('.').length === JWT_SEGMENT_COUNT;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  throw new Error('Base64 decoder is unavailable in this environment.');
}

function decodeJwtPayload(token: string): JwtPayload | null {
  if (!isJwtLike(token)) return null;

  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = decodeBase64Url(payload);
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? (parsed as JwtPayload) : null;
  } catch {
    return null;
  }
}

function isTokenUsable(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.nbf === 'number' && payload.nbf > now + CLIENT_EXPIRY_SKEW_SECONDS) {
    return false;
  }

  if (typeof payload.exp === 'number' && payload.exp <= now + CLIENT_EXPIRY_SKEW_SECONDS) {
    return false;
  }

  return true;
}

export function getPiAuthToken() {
  if (memoryToken && isTokenUsable(memoryToken)) return memoryToken;
  if (memoryToken && !isTokenUsable(memoryToken)) {
    clearStoredToken();
    return null;
  }

  const storage = getSessionStorageSafe();
  const stored = storage?.getItem(APP_SESSION_TOKEN_KEY) || null;
  if (!stored) return null;

  if (!isTokenUsable(stored)) {
    clearStoredToken();
    return null;
  }

  memoryToken = stored;
  return stored;
}

export function setPiAuthToken(token: string) {
  const normalized = String(token || '').trim();
  if (!normalized || !isTokenUsable(normalized)) {
    throw new Error('Cannot store an invalid or expired app session token.');
  }

  memoryToken = normalized;
  const storage = getSessionStorageSafe();
  storage?.setItem(APP_SESSION_TOKEN_KEY, normalized);
}

export function clearPiAuthToken() {
  clearStoredToken();
}

export function getPiAuthHeaders(init?: HeadersInit): Headers {
  const token = getPiAuthToken();
  const headers = new Headers(init || {});
  headers.set('X-App-Request', 'pi-web');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export async function piApiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    headers: getPiAuthHeaders(buildObservabilityHeaders(init.headers)),
    cache: init.cache ?? 'no-store',
  });

  if (response.status === 401) {
    const payload = await response.clone().json().catch(() => null);
    const reason = typeof payload?.reason === 'string' ? payload.reason : null;
    if (
      reason === 'NO_SESSION_TOKEN' ||
      reason === 'MALFORMED_AUTHORIZATION_HEADER' ||
      reason === 'INVALID_OR_EXPIRED_SESSION'
    ) {
      clearStoredToken();
    }
  }

  return response;
}
