'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AdminLoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'admin-web',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Unable to sign in.');
      }

      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Admin Access</span>
          <h1>Admin login</h1>
        </div>
        <p>Use your admin username or email and password. This login is separate from Pi sign-in.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 20 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Username or email</span>
          <input
            className="input"
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input
            className="input"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p style={{ color: '#b42318', margin: 0 }}>{error}</p> : null}

        <button className="button primary" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in to admin'}
        </button>
      </form>
    </div>
  );
}
