'use client';

import { useState } from 'react';

type RoleKey = 'visitor' | 'trader' | 'artist';

const ROLE_OPTIONS: Array<{ key: RoleKey; title: string; description: string }> = [
  { key: 'visitor', title: 'Visitor', description: 'Browse the platform and keep a basic Pi-linked account.' },
  { key: 'trader', title: 'Trader', description: 'Buy, collect, and manage NFT assets on the marketplace.' },
  { key: 'artist', title: 'Artist', description: 'Upload, review, mint, and publish your own NFT artworks.' },
];

export function RoleUpgradeSection({ currentRole }: { currentRole: string }) {
  const [selectedRole, setSelectedRole] = useState<RoleKey>((['visitor', 'trader', 'artist'].includes(currentRole) ? currentRole : 'visitor') as RoleKey);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function saveRole() {
    try {
      setLoading(true);
      setMessage('Saving your role...');
      const response = await fetch('/api/account/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ role: selectedRole })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update role.');
      setMessage('Role updated successfully. Reloading your account...');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update role.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ padding: '24px' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Marketplace access</span>
          <h2>Choose your role</h2>
        </div>
        <p>Every Pi account starts as Visitor. Change your role here whenever you want to trade or publish.</p>
      </div>

      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {ROLE_OPTIONS.map((option) => {
          const active = selectedRole === option.key;
          return (
            <label key={option.key} className="card" style={{ padding: '16px', display: 'grid', gap: '10px', cursor: 'pointer', border: active ? '1px solid var(--brand)' : undefined }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <input type="radio" name="role" checked={active} onChange={() => setSelectedRole(option.key)} />
                <div>
                  <strong>{option.title}</strong>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>{option.description}</p>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="form-actions">
        <button className="button primary" type="button" onClick={saveRole} disabled={loading || selectedRole === currentRole}>
          {loading ? 'Saving...' : 'Save role'}
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </section>
  );
}
