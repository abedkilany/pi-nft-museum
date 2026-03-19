
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteAccountSection() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!confirm('This will permanently delete your account and artworks. Continue?')) return;
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || 'Failed to delete account.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <form className="card upload-form" onSubmit={handleDelete}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Danger zone</span>
          <h1>Delete account</h1>
        </div>
        <p>This action permanently removes your account, artworks, comments, and related activity. No password is required because access is now handled by Pi sign-in.</p>
      </div>
      <div className="form-actions">
        <button className="button secondary" type="submit" disabled={busy}>{busy ? 'Deleting...' : 'Delete my account'}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </form>
  );
}
