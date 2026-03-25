'use client';

import { useState } from 'react';
import { adminApiFetch } from '@/lib/admin-auth-client';

type Props = {
  errorId: number;
  currentStatus: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
};

export function ErrorStatusForm({ errorId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      const formData = new FormData();
      formData.set('status', status);
      if (note.trim()) formData.set('note', note.trim());

      const response = await adminApiFetch(`/api/admin/errors/${errorId}/status`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Update failed with status ${response.status}`);
      }

      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update error status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 240px 220px' }}>
      <textarea
        name="note"
        placeholder="Optional note for your team or programmer"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <select name="status" value={status} onChange={(event) => setStatus(event.target.value as Props['currentStatus'])}>
        <option value="OPEN">Open</option>
        <option value="INVESTIGATING">Investigating</option>
        <option value="RESOLVED">Resolved</option>
        <option value="IGNORED">Ignored</option>
      </select>
      <button type="submit" className="button primary" disabled={saving}>
        {saving ? 'Updating…' : 'Update status'}
      </button>
    </form>
  );
}
