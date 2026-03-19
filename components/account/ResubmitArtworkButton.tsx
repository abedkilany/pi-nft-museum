'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

export function ResubmitArtworkButton({ artworkId }: { artworkId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResubmit() {
    setLoading(true);

    const response = await piApiFetch('/api/artworks/resubmit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId })
    });

    if (response.ok) {
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <button
      className="button primary"
      onClick={handleResubmit}
      disabled={loading}
    >
      {loading ? 'Resubmitting...' : 'Resubmit for Review'}
    </button>
  );
}