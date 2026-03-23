'use client';

import { useEffect } from 'react';
import { reportReactBoundaryError } from '@/components/error/ErrorMonitorClient';

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportReactBoundaryError(error);
  }, [error]);

  return (
    <div className="page-stack">
      <section className="card surface-section">
        <span className="section-kicker">Error</span>
        <h1>Something went wrong on this page</h1>
        <p>We recorded the issue automatically. You can retry now.</p>
        <div className="card" style={{ padding: '16px', marginTop: '16px' }}>
          <strong>Error message</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{error.message}</pre>
          {error.digest ? <p style={{ color: 'var(--muted)' }}>Digest: {error.digest}</p> : null}
        </div>
        <button className="button primary" onClick={() => reset()} style={{ marginTop: '16px' }}>
          Try again
        </button>
      </section>
    </div>
  );
}
