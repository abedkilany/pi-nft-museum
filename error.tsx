'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html>
      <body style={{ background: '#0b1020', color: '#fff', fontFamily: 'Arial, sans-serif', padding: '40px' }}>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred in the application.</p>

        <div style={{ marginTop: '20px', padding: '16px', background: '#151c33', borderRadius: '12px' }}>
          <strong>Error message:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{error.message}</pre>
        </div>

        <button
          onClick={() => reset()}
          style={{
            marginTop: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            border: 'none',
            background: '#f0c45c',
            color: '#111',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}