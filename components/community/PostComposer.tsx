'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type Props = {
  disabled?: boolean;
  username?: string | null;
};

export function PostComposer({ disabled = false, username }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || busy || body.trim().length < 3) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/community/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to publish post.');
        return;
      }
      setBody('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div>
        <span className="section-kicker">Post composer</span>
        <h2 style={{ margin: '6px 0 0' }}>Share something with the community</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={5}
          maxLength={1500}
          placeholder={disabled ? 'Log in to publish a post.' : `What would you like to share${username ? `, @${username}` : ''}?`}
          disabled={disabled || busy}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{body.trim().length}/1500</span>
          <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
            {message ? <span style={{ color: '#f87171', fontSize: 13 }}>{message}</span> : null}
            <button className="button primary" type="submit" disabled={disabled || busy || body.trim().length < 3}>
              {busy ? 'Publishing...' : 'Publish post'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
