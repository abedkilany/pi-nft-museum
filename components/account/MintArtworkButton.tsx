'use client';

import { useState } from 'react';
import { authenticateWithPi, createPiPayment } from '@/lib/domains/pi';
import { piApiFetch } from '../../lib/pi-auth-client';

export function MintArtworkButton({ artworkId, title, onMinted }: { artworkId: number; title: string; onMinted?: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleMint() {
    const confirmed = window.confirm('Lazy Mint costs 1 Pi as a platform fee. After successful payment, the artwork will be published to the gallery. On-chain minting will become available later when Pi tooling is ready.');
    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      setMessage('Requesting Pi payment permissions...');
      await authenticateWithPi(['username', 'payments']);

      setMessage('Opening Pi payment window...');

      await createPiPayment(
        {
          amount: 1,
          memo: `Lazy Mint fee for ${title}`,
          metadata: { artworkId, title, purpose: 'LAZY_MINT_FEE', mode: 'testnet' }
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            const response = await piApiFetch('/api/pi/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, artworkId, purpose: 'LAZY_MINT_FEE' })
            });

            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || 'Server approval failed.');
            }

            setMessage('Payment approved. Complete it in Pi.');
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            const response = await piApiFetch('/api/pi/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid })
            });

            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || 'Server completion failed.');
            }

            setMessage('Lazy mint fee paid successfully. The artwork is now published in the gallery.');
            if (onMinted) {
              await onMinted();
            }
            setLoading(false);
          },
          onCancel: () => {
            setMessage('Payment cancelled. Lazy Mint was not completed.');
            setLoading(false);
          },
          onError: (error) => {
            setMessage(error?.message || 'Payment failed.');
            setLoading(false);
          }
        }
      );
    } catch {
      setLoading(false);
      setMessage('Something went wrong while starting the lazy mint payment.');
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
        {loading ? 'Opening Pi payment...' : 'Lazy Mint — 1 Pi'}
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
        Lazy Mint charges a 1 Pi platform fee, then publishes the artwork on-platform. On-chain minting will be enabled later through Pi Network.
      </p>

      {message ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>{message}</p>
      ) : null}
    </div>
  );
}
