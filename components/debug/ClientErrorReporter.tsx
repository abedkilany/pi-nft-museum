'use client';

import { useEffect } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

function sendReport(payload: Record<string, unknown>) {
  void piApiFetch('/api/debug/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

export function ClientErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      sendReport({
        type: 'window.error',
        path: window.location.pathname,
        message: event.message,
        stack: event.error?.stack ?? null,
        detail: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        occurredAt: new Date().toISOString(),
      });
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      sendReport({
        type: 'unhandledrejection',
        path: window.location.pathname,
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : null,
        detail: reason,
        occurredAt: new Date().toISOString(),
      });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
