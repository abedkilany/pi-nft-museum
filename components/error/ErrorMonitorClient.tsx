'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

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

async function reportClientError(payload: ClientErrorPayload) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
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
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason ?? 'Unhandled promise rejection'));
      Sentry.captureException(reason, {
        tags: { source: 'client-unhandled-rejection' }
      });

      void reportClientError({
        title: 'Unhandled promise rejection',
        message: reason.message,
        source: 'CLIENT',
        route: window.location.pathname,
        url: window.location.href,
        errorName: reason.name,
        stack: reason.stack
      });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
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
