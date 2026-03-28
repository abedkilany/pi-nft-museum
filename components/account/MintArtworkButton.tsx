'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

export function MintArtworkButton({ artworkId, onMinted }: { artworkId: number; onMinted?: () => void | Promise<void> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleMint() {
    const confirmed = window.confirm('This will create a lazy-mint record inside the platform and publish the artwork to the gallery. On-chain minting will become available later when Pi tooling is ready.');
    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      const response = await piApiFetch('/api/artworks/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to lazy mint artwork.');
        setLoading(false);
        return;
      }

      setMessage('Lazy mint completed. The artwork is now published in the gallery.');
      if (onMinted) {
        await onMinted();
      } else {
        router.refresh();
      }
    } catch {
      setMessage('Something went wrong while lazy minting the artwork.');
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
        {loading ? 'Lazy minting...' : 'Lazy Mint'}
      </button>

      <button
        className="button secondary"
        type="button"
        disabled
        title="On-chain minting will be available once Pi Network tooling is ready."
      >
        Mint
      </button>

      <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>
        Lazy Mint publishes the artwork on-platform now. On-chain minting will be enabled later through Pi Network.
      </p>

      {message ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>{message}</p>
      ) : null}
    </div>
  );
}
