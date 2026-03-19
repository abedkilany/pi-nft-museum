'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function MintArtworkButton({ artworkId }: { artworkId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleMint() {
    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/artworks/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to mint artwork.');
        setLoading(false);
        return;
      }

      setMessage('Mint completed successfully.');
      router.refresh();
    } catch {
      setMessage('Something went wrong while minting the artwork.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button
        className="button primary"
        type="button"
        onClick={handleMint}
        disabled={loading}
      >
        {loading ? 'Minting...' : 'Start Mint'}
      </button>

      {message ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>{message}</p>
      ) : null}
    </div>
  );
}
