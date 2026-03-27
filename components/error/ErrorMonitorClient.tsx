'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { buildObservabilityHeaders, consumeOrCreateTraceId } from '@/lib/observability-client';

type ClientErrorPayload = {
  title: string;
  message: string;
  readableSummary?: string;
  source: 'CLIENT' | 'REACT';
  route?: string;
  url?: string;
  errorName?: string;
  stack?: string | null;
  componentStack?: string | null;
  digest?: string | null;
  code?: string | null;
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
};


function normalizeUnknownError(reason: unknown) {
  if (reason instanceof Error) {
    return {
      message: reason.message,
      errorName: reason.name,
      stack: reason.stack ?? null,
      extra: {
        cause: reason.cause ?? null,
      } as Record<string, unknown>,
    };
  }

  if (typeof reason === 'object' && reason) {
    const record = reason as Record<string, unknown>;
    return {
      message: String(record.message || record.error || 'Unhandled promise rejection'),
      errorName: typeof record.name === 'string' ? record.name : 'UnhandledPromiseRejection',
      stack: typeof record.stack === 'string' ? record.stack : null,
      extra: {
        ...record,
      },
    };
  }

  return {
    message: String(reason ?? 'Unhandled promise rejection'),
    errorName: 'UnhandledPromiseRejection',
    stack: null,
    extra: {
      rawReason: reason ?? null,
    } as Record<string, unknown>,
  };
}

function toRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return null;
}

function shouldIgnoreObservedRequest(url: string | null) {
  if (!url) return true;
  return url.includes('/api/events') || url.includes('/api/client-errors') || url.includes('/api/auth/pi/debug');
}

function classifyObservedFetch(url: string | null, status: number) {
  const normalizedUrl = String(url || '');
  const isAuthProbe = normalizedUrl.includes('/api/auth/me') || normalizedUrl.includes('/api/auth/refresh');

  if (isAuthProbe && status === 401) {
    return {
      category: 'AUTH_STATE',
      severity: 'LOW',
      readableSummary: `Expected unauthenticated auth probe for ${normalizedUrl}`,
      tags: { anomaly: false, expected: true, authState: 'unauthenticated_probe' } as Record<string, unknown>,
    };
  }

  return {
    category: 'SYSTEM_FLOW',
    severity: status >= 500 ? 'HIGH' : 'MEDIUM',
    readableSummary: null,
    tags: { anomaly: true } as Record<string, unknown>,
  };
}

async function reportClientError(payload: ClientErrorPayload) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: buildObservabilityHeaders({ 'content-type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch {
    // Avoid throwing inside the error reporter.
  }
}

export function ErrorMonitorClient() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = toRequestUrl(input);
      const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
      const startedAt = performance.now();

      try {
        const response = await originalFetch(input, init);
        if (!shouldIgnoreObservedRequest(url) && response.status >= 400) {
          const traceId = consumeOrCreateTraceId();
          const classification = classifyObservedFetch(url, response.status);
          void fetch('/api/events', {
            method: 'POST',
            headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, traceId),
            body: JSON.stringify({
              category: classification.category,
              type: 'FETCH',
              name: 'CLIENT_FETCH_NON_SUCCESS',
              eventKey: 'CLIENT_FETCH_NON_SUCCESS',
              status: response.status >= 500 ? 'FAILED' : 'WARNING',
              severity: classification.severity,
              isHealthy: classification.category === 'AUTH_STATE',
              source: 'CLIENT',
              feature: url?.includes('/api/auth') ? 'auth' : 'general',
              route: window.location.pathname,
              url: window.location.href,
              traceId,
              correlationId: traceId,
              httpStatus: response.status,
              message: `Fetch returned ${response.status} for ${url || 'unknown URL'}`,
              readableSummary: classification.readableSummary,
              tags: classification.tags,
              data: {
                requestUrl: url,
                requestMethod: method,
                durationMs: Math.round(performance.now() - startedAt),
              }
            }),
            keepalive: true,
            cache: 'no-store',
          }).catch(() => null);
        }
        return response;
      } catch (error) {
        if (!shouldIgnoreObservedRequest(url)) {
          const traceId = consumeOrCreateTraceId();
          const normalized = normalizeUnknownError(error);
          void fetch('/api/events', {
            method: 'POST',
            headers: buildObservabilityHeaders({ 'Content-Type': 'application/json' }, traceId),
            body: JSON.stringify({
              category: 'SYSTEM_FLOW',
              type: 'FETCH',
              name: 'CLIENT_FETCH_FAILED',
              eventKey: 'CLIENT_FETCH_FAILED',
              status: 'FAILED',
              severity: 'MEDIUM',
              isHealthy: false,
              source: 'CLIENT',
              feature: url?.includes('/api/auth') ? 'auth' : 'general',
              route: window.location.pathname,
              url: window.location.href,
              traceId,
              correlationId: traceId,
              errorName: normalized.errorName,
              errorStack: normalized.stack,
              message: normalized.message,
              data: {
                requestUrl: url,
                requestMethod: method,
                durationMs: Math.round(performance.now() - startedAt),
                ...normalized.extra,
              }
            }),
            keepalive: true,
            cache: 'no-store',
          }).catch(() => null);
        }
        throw error;
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message || 'Unhandled browser error');
      Sentry.captureException(error, {
        tags: { source: 'client-window-error' }
      });

      void reportClientError({
        title: 'Unhandled browser error',
        message: error.message,
        source: 'CLIENT',
        route: window.location.pathname,
        url: window.location.href,
        errorName: error.name,
        stack: error.stack,
        extra: {
          filename: event.filename,
          line: event.lineno,
          column: event.colno
        }
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const normalized = normalizeUnknownError(event.reason);
      Sentry.captureException(event.reason instanceof Error ? event.reason : new Error(normalized.message), {
        tags: { source: 'client-unhandled-rejection' },
        extra: normalized.extra,
      });

      void reportClientError({
        title: 'Unhandled promise rejection',
        message: normalized.message,
        source: 'CLIENT',
        route: window.location.pathname,
        url: window.location.href,
        errorName: normalized.errorName,
        stack: normalized.stack,
        extra: normalized.extra
      });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

export async function reportReactBoundaryError(error: Error & { digest?: string }, componentStack?: string) {
  Sentry.captureException(error, {
    tags: { source: 'react-error-boundary' },
    extra: { componentStack }
  });

  await reportClientError({
    title: 'React boundary error',
    message: error.message,
    readableSummary: `React failed to render ${typeof window !== 'undefined' ? window.location.pathname : 'the current page'}.`,
    source: 'REACT',
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    errorName: error.name,
    stack: error.stack,
    digest: error.digest ?? null,
    componentStack: componentStack ?? null
  });
}
