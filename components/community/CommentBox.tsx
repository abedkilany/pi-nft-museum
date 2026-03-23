'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '@/lib/pi-auth-client';

type Props = {
  postId: number;
  parentId?: number | null;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
  submitLabel?: string;
  minRows?: number;
  onSuccess?: () => void;
};

export function CommentBox({
  postId,
  parentId = null,
  disabled = false,
  compact = false,
  placeholder,
  submitLabel,
  minRows = 3,
  onSuccess,
}: Props) {
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
        body: JSON.stringify({ postId, parentId, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data?.error || 'Unable to add comment.');
        return;
      }
      setBody('');
      onSuccess?.();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: compact ? 8 : 10 }}>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={minRows}
        placeholder={placeholder || (disabled ? 'Log in to join the discussion.' : parentId ? 'Write a reply...' : 'Write a comment...')}
        disabled={disabled || busy}
      />
      <div className="card-actions" style={{ gap: 8, marginTop: 0 }}>
        <button className="button primary" type="submit" disabled={disabled || busy || body.trim().length < 2}>
          {busy ? 'Posting...' : submitLabel || (parentId ? 'Reply' : 'Post comment')}
        </button>
        {message ? <span style={{ color: '#f87171', fontSize: 13 }}>{message}</span> : null}
      </div>
    </form>
  );
}
