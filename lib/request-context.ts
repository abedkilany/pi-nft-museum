import crypto from 'crypto';

export function generateRequestId() {
  return crypto.randomUUID();
}

export function generateSpanId() {
  return crypto.randomUUID();
}

export function getHeaderCaseInsensitive(headersLike: Headers | Record<string, string | null | undefined>, key: string) {
  if (headersLike instanceof Headers) {
    return headersLike.get(key) || headersLike.get(key.toLowerCase()) || headersLike.get(key.toUpperCase());
  }

  const lowered = key.toLowerCase();
  for (const [entryKey, value] of Object.entries(headersLike)) {
    if (entryKey.toLowerCase() === lowered) return value ?? null;
  }
  return null;
}

export function getRequestContextFromHeaders(headersLike: Headers | Record<string, string | null | undefined>) {
  const traceId =
    getHeaderCaseInsensitive(headersLike, 'x-trace-id') ||
    getHeaderCaseInsensitive(headersLike, 'x-correlation-id') ||
    null;

  const requestId =
    getHeaderCaseInsensitive(headersLike, 'x-request-id') ||
    getHeaderCaseInsensitive(headersLike, 'x-vercel-id') ||
    generateRequestId();

  const sessionId = getHeaderCaseInsensitive(headersLike, 'x-session-id') || null;
  const ipAddress =
    getHeaderCaseInsensitive(headersLike, 'x-forwarded-for') ||
    getHeaderCaseInsensitive(headersLike, 'x-real-ip') ||
    null;

  const spanId = getHeaderCaseInsensitive(headersLike, 'x-span-id') || null;
  const parentSpanId = getHeaderCaseInsensitive(headersLike, 'x-parent-span-id') || null;

  return {
    traceId,
    spanId,
    parentSpanId,
    correlationId: traceId,
    requestId,
    sessionId,
    ipAddress,
    userAgent: getHeaderCaseInsensitive(headersLike, 'user-agent') || null
  };
}
