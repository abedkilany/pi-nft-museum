'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MenuItem } from '@/lib/menu';
import { piApiFetch } from '../../lib/pi-auth-client';

export function MenuEditor({ initialItems }: { initialItems: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function updateItem(index: number, key: keyof MenuItem, value: string | boolean) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  function addItem() {
    setItems((current) => [...current, { label: '', href: '', visibility: 'public', enabled: true }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const response = await piApiFetch('/api/admin/menu/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || 'Failed to save menu.');
      return;
    }
    setMessage('Menu updated successfully.');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Navigation</span>
          <h1>Menu Builder</h1>
        </div>
        <p>Control which menu links appear for public visitors, signed-in users, or admins.</p>
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        {items.map((item, index) => (
          <div key={index} className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
            <div className="form-grid">
              <label>
                <span>Label</span>
                <input value={item.label} onChange={(e) => updateItem(index, 'label', e.target.value)} />
              </label>
              <label>
                <span>Link</span>
                <input value={item.href} onChange={(e) => updateItem(index, 'href', e.target.value)} />
              </label>
              <label>
                <span>Visibility</span>
                <select value={item.visibility || 'public'} onChange={(e) => updateItem(index, 'visibility', e.target.value)}>
                  <option value="public">Public</option>
                  <option value="guest">Guests only</option>
                  <option value="auth">Signed-in users</option>
                  <option value="admin">Admins only</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={item.enabled === false ? 'false' : 'true'} onChange={(e) => updateItem(index, 'enabled', e.target.value === 'true')}>
                  <option value="true">Visible</option>
                  <option value="false">Hidden</option>
                </select>
              </label>
            </div>
            <div>
              <button type="button" className="button secondary" onClick={() => removeItem(index)}>Remove item</button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={addItem}>Add menu item</button>
        <button type="submit" className="button primary" disabled={loading}>{loading ? 'Saving...' : 'Save menu'}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </form>
  );
}