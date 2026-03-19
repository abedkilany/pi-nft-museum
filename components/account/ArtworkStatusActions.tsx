'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ArtworkStatusActions({ artworkId, status }: { artworkId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const targetStatus = status === 'DRAFT' ? 'PENDING' : status === 'PENDING' ? 'DRAFT' : status === 'ARCHIVED' ? 'RESTORE_ARCHIVED' : null;
  if (!targetStatus) return null;

  async function handleChange() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/artworks/owner-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId, targetStatus }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.error || data.message || 'Updated.');
    if (response.ok) router.refresh();
  }

  const label = targetStatus === 'PENDING'
    ? 'Submit for review'
    : targetStatus === 'DRAFT'
      ? 'Move back to draft'
      : 'Restore from archive';

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button className="button secondary" type="button" onClick={handleChange} disabled={busy}>
        {busy ? 'Updating...' : label}
      </button>
      {message ? <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>{message}</p> : null}
    </div>
  );
}
