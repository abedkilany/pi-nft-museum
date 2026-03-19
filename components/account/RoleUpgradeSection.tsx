"use client";

import { useState } from 'react';

type RoleKey = 'visitor' | 'artist_or_trader';

const ROLE_OPTIONS: Array<{ key: RoleKey; title: string; description: string }> = [
  { key: 'visitor', title: 'Visitor', description: 'Browse the platform and keep a basic Pi-linked account.' },
  { key: 'artist_or_trader', title: 'Artist / Trader', description: 'Upload, review, mint, buy, collect, and manage NFT artworks.' },
];

export function RoleUpgradeSection({ currentRole }: { currentRole: string }) {
  const [selectedRole, setSelectedRole] = useState<RoleKey>((['visitor', 'artist_or_trader'].includes(currentRole) ? currentRole : 'visitor') as RoleKey);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/account/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to update role.');
      setMessage('Role updated successfully. Refreshing...');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update role.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '16px' }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Account role</h2>
        <p>Every Pi account starts as Visitor. Upgrade to Artist / Trader when you want to publish or trade.</p>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {ROLE_OPTIONS.map((option) => (
          <label key={option.key} className="field" style={{ cursor: 'pointer' }}>
            <span style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <input
                type="radio"
                name="role"
                value={option.key}
                checked={selectedRole === option.key}
                onChange={() => setSelectedRole(option.key)}
              />
              <span>
                <strong>{option.title}</strong>
                <span className="field-help" style={{ display: 'block' }}>{option.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button type="button" className="button primary" onClick={handleSubmit} disabled={loading || selectedRole === currentRole}>
          {loading ? 'Saving...' : 'Save role'}
        </button>
        {message ? <p style={{ margin: 0, color: 'var(--muted)' }}>{message}</p> : null}
      </div>
    </section>
  );
}
