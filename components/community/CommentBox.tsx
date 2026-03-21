'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type Props = {
  postId: number;
  disabled?: boolean;
};

export function CommentBox({ postId, disabled = false }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || busy || body.trim().length < 2) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await piApiFetch('/api/community/posts/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to add comment.');
        return;
      }
      setBody('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        placeholder={disabled ? 'Log in to join the discussion.' : 'Write a comment...'}
        disabled={disabled || busy}
      />
      <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
        <button className="button primary" type="submit" disabled={disabled || busy || body.trim().length < 2}>
          {busy ? 'Posting...' : 'Post comment'}
        </button>
        {message ? <span style={{ color: '#f87171', fontSize: 13 }}>{message}</span> : null}
      </div>
    </form>
  );
}
