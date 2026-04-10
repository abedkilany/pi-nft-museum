'use client';

import { useState } from 'react';
import { createPiPayment } from '@/lib/domains/pi';
import { piApiFetch } from '../../lib/pi-auth-client';
import { usePiAuth } from '@/components/auth/PiAuthProvider';

type MintMode = 'LAZY' | 'TESTNET';

const COPY: Record<MintMode, { button: string; memoPrefix: string; purpose: 'LAZY_MINT_FEE' | 'TESTNET_MINT_FEE'; confirm: string; success: string; description: string; }> = {
  LAZY: {
    button: 'Lazy Mint — 1 Pi',
    memoPrefix: 'Lazy Mint fee for',
    purpose: 'LAZY_MINT_FEE',
    confirm: 'Lazy Mint costs 1 Pi as a platform fee. After successful payment, the artwork will be finalized off-chain and published to the gallery.',
    success: 'Lazy Mint completed successfully. The artwork is now published as an off-chain item.',
    description: 'Finalize off-chain and publish inside the platform.',
  },
  TESTNET: {
    button: 'Testnet Mint — 1 Pi',
    memoPrefix: 'Testnet Mint fee for',
    purpose: 'TESTNET_MINT_FEE',
    confirm: 'Testnet Mint costs 1 Pi as a platform fee. After successful payment, the artwork will be finalized as a Pi Testnet item and published to the gallery.',
    success: 'Testnet Mint completed successfully. The artwork is now published as a Pi Testnet item.',
    description: 'Finalize on Pi Testnet and publish inside the platform.',
  },
};

export function MintArtworkButton({
  artworkId,
  title,
  mode = 'LAZY',
  onMinted,
  disabled = false,
  disabledReason = null,
}: {
  artworkId: number;
  title: string;
  mode?: MintMode;
  onMinted?: () => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { ensurePaymentScope } = usePiAuth();
  const config = COPY[mode];

  async function handleMint() {
    if (disabled) {
      setMessage(disabledReason || 'You do not have permission to start this payment.');
      return;
    }

    const confirmed = window.confirm(config.confirm);
    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage('');

      setMessage('Refreshing Pi payment permissions...');
      const authenticatedUser = await ensurePaymentScope();
      if (!authenticatedUser) {
        throw new Error('Please reconnect with Pi before starting this mint payment.');
      }

      setMessage('Opening Pi payment window...');

      await createPiPayment(
        {
          amount: 1,
          memo: `${config.memoPrefix} ${title}`,
          metadata: { artworkId, title, purpose: config.purpose, mode: 'testnet', mintMode: mode }
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            const response = await piApiFetch('/api/pi/payments/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, artworkId, purpose: config.purpose })
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

            setMessage(config.success);
            if (onMinted) await onMinted();
            setLoading(false);
          },
          onCancel: () => {
            setMessage('Payment cancelled. Mint was not completed.');
            setLoading(false);
          },
          onError: (error) => {
            setMessage(error?.message || 'Payment failed.');
            setLoading(false);
          }
        }
      );
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : 'Something went wrong while starting the mint payment.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button
        className={mode === 'TESTNET' ? 'button secondary' : 'button primary'}
        type="button"
        onClick={handleMint}
        disabled={disabled || loading}
        title={config.description}
      >
        {loading ? 'Opening Pi payment...' : config.button}
      </button>

      <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>{config.description}</p>

      {disabledReason ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>{disabledReason}</p>
      ) : null}

      {message ? (
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.85 }}>{message}</p>
      ) : null}
    </div>
  );
}
