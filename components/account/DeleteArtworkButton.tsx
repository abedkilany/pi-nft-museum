
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteArtworkButton({ artworkId, title, archived = false }: { artworkId: number; title: string; archived?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAction(permanent = false) {
    const promptText = permanent
      ? `Permanently delete artwork "${title}"? This cannot be undone.`
      : `Archive artwork "${title}"? It will stay recoverable for the configured retention period.`;
    if (!confirm(promptText)) return;
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/artworks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId, permanent })
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.error || data.message || (permanent ? 'Artwork permanently deleted.' : 'Artwork archived.'));
    if (!response.ok) return;
    router.refresh();
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button className="button secondary" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? 'Close removal options' : archived ? 'Remove archived artwork' : 'Archive / delete'}
      </button>
      {open ? (
        <div className="card" style={{ padding: '12px', display: 'grid', gap: '8px' }}>
          {!archived ? (
            <button className="button secondary" type="button" onClick={() => handleAction(false)} disabled={busy}>
              {busy ? 'Working...' : 'Archive artwork'}
            </button>
          ) : null}
          <button className="button secondary" type="button" onClick={() => handleAction(true)} disabled={busy}>
            {busy ? 'Working...' : 'Delete permanently'}
          </button>
          {message ? <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
