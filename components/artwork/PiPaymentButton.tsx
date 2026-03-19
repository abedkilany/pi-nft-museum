'use client';

import { useMemo, useState } from 'react';
import { authenticateWithPi, createPiPayment } from '@/lib/pi';

type Props = {
  artworkId: number;
  title: string;
  amount: number;
  currency: string;
  disabled?: boolean;
  disabledReason?: string | null;
};

export function PiPaymentButton({
  artworkId,
  title,
  amount,
  currency,
  disabled = false,
  disabledReason = null
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const label = useMemo(
    () => `Pay ${amount.toFixed(2)} ${currency} on Testnet`,
    [amount, currency]
  );

  async function handlePayment() {
    try {
      setLoading(true);
      setMessage('Requesting Pi payment permissions...');

      await authenticateWithPi();

      setMessage('Opening Pi payment window...');

      await createPiPayment(
        {
          amount,
          memo: `Testnet purchase for ${title}`,
          metadata: { artworkId, title, mode: 'testnet' }
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            try {
              setMessage('Payment created. Waiting for server approval...');

              const response = await fetch('/api/pi/payments/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ paymentId, artworkId })
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Server approval failed.');
              }

              setMessage('Payment approved. Complete it in Pi.');
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Server approval failed.'
              );
            }
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            try {
              setMessage('Blockchain transaction submitted. Finalizing...');

              const response = await fetch('/api/pi/payments/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ paymentId, txid })
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Server completion failed.');
              }

              setMessage('Testnet payment completed successfully.');
              window.location.reload();
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Server completion failed.'
              );
            }
          },

          onCancel: () => {
            setMessage('Payment cancelled.');
          },

          onError: (error) => {
            setMessage(error?.message || 'Payment failed.');
          }
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment failed.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <button
        className="button primary"
        type="button"
        onClick={handlePayment}
        disabled={disabled || loading}
      >
        {loading ? 'Opening Pi payment...' : label}
      </button>

      {disabledReason ? <p className="form-message">{disabledReason}</p> : null}
      {message ? <p className="form-message">{message}</p> : null}

      <p className="form-message" style={{ color: 'var(--muted)' }}>
        Test mode only. This flow is intended for Pi Testnet / Sandbox experiments.
      </p>
    </div>
  );
}